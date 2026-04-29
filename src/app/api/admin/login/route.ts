import { NextResponse } from 'next/server';
import { signAdminToken, verifyAdminPassword, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
import { checkLoginRateLimit } from '@/lib/ratelimit';

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(request: Request) {
  // ── Rate limiting (Redis-backed, survives restarts & horizontal scaling) ───
  const ip = getClientIp(request);
  const rl = await checkLoginRateLimit(ip);
  if (!rl.allowed) {
    const minutesLeft = Math.ceil(rl.retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `Per daug bandymų. Bandykite po ${minutesLeft} min.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  if (typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Trūksta slaptažodžio' }, { status: 400 });
  }

  if (!verifyAdminPassword(body.password)) {
    // Intentionally vague — don't reveal whether the account exists.
    return NextResponse.json({ error: 'Neteisingas slaptažodis' }, { status: 401 });
  }

  const token = await signAdminToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}
