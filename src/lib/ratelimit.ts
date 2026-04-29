import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// ─── Redis + limiters (lazy singletons) ──────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // dev without Upstash — falls back to in-memory
  _redis = new Redis({ url, token });
  return _redis;
}

let _presignLimiter: Ratelimit | null = null;
let _loginLimiter: Ratelimit | null = null;

function getPresignLimiter(): Ratelimit | null {
  if (_presignLimiter) return _presignLimiter;
  const redis = getRedis();
  if (!redis) return null;
  _presignLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:presign',
    ephemeralCache: new Map(), // process-local L1 cache to cut Redis round-trips
  });
  return _presignLimiter;
}

function getLoginLimiter(): Ratelimit | null {
  if (_loginLimiter) return _loginLimiter;
  const redis = getRedis();
  if (!redis) return null;
  _loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, '15 m'),
    prefix: 'rl:login',
  });
  return _loginLimiter;
}

// ─── In-memory fallback (development only) ────────────────────────────────────
// In production env.ts ensures Upstash is configured, so this path is never hit.

const _inMemory = new Map<string, { count: number; resetAt: number }>();

function inMemoryCheck(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = _inMemory.get(key);
  if (!entry || entry.resetAt < now) {
    _inMemory.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function checkPresignRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getPresignLimiter();
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Upstash not configured in production');
    }
    return inMemoryCheck(`presign:${ip}`, 30, 60_000);
  }
  const { success, reset } = await limiter.limit(ip);
  return {
    allowed: success,
    retryAfterSeconds: success ? 0 : Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
  };
}

export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  const limiter = getLoginLimiter();
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Upstash not configured in production');
    }
    return inMemoryCheck(`login:${ip}`, 5, 15 * 60_000);
  }
  const { success, reset } = await limiter.limit(ip);
  return {
    allowed: success,
    retryAfterSeconds: success ? 0 : Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
  };
}
