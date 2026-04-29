/**
 * Strict environment validation — called once at server startup via instrumentation.ts.
 * Throws with a clear message on any missing or obviously-weak required variable.
 * Never runs at build time (called from register() which only fires at runtime).
 */

function required(name: string): string {
  const val = process.env[name];
  if (!val || !val.trim()) {
    throw new Error(
      `[FATAL] Missing required environment variable: ${name}\n` +
      `Set it in Railway → Variables (production) or .env.local (development).`,
    );
  }
  return val.trim();
}

function optionalUrl(name: string): void {
  const val = process.env[name];
  if (!val) return;
  try {
    new URL(val);
  } catch {
    throw new Error(`[FATAL] ${name} is not a valid URL: "${val}"`);
  }
}

export function validateEnv(): void {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error(
      '[FATAL] JWT_SECRET must be at least 32 characters.\n' +
      'Generate one with: openssl rand -hex 32',
    );
  }

  const adminPassword = required('ADMIN_PASSWORD');
  if (adminPassword.length < 12) {
    throw new Error('[FATAL] ADMIN_PASSWORD must be at least 12 characters.');
  }

  // ── R2 ───────────────────────────────────────────────────────────────────
  required('R2_ACCESS_KEY_ID');
  required('R2_SECRET_ACCESS_KEY');
  required('R2_BUCKET_NAME');

  const r2Endpoint = required('R2_ENDPOINT');
  try {
    new URL(r2Endpoint);
  } catch {
    throw new Error(
      `[FATAL] R2_ENDPOINT is not a valid URL: "${r2Endpoint}"\n` +
      'Expected format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
    );
  }

  // Optional — only needed if bucket is made public via R2 custom domain / r2.dev
  optionalUrl('R2_PUBLIC_BASE_URL');

  // ── App ──────────────────────────────────────────────────────────────────
  const appOrigin = required('APP_ORIGIN');
  try {
    new URL(appOrigin);
  } catch {
    throw new Error(
      `[FATAL] APP_ORIGIN is not a valid URL: "${appOrigin}"\n` +
      'Example: https://wedding.up.railway.app',
    );
  }

  // ── Rate limiting (Redis) ─────────────────────────────────────────────────
  required('UPSTASH_REDIS_REST_URL');
  required('UPSTASH_REDIS_REST_TOKEN');

  console.log('[startup] Environment validation passed.');
}
