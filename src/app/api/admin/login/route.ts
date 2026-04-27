import { NextResponse } from 'next/server';
import { signAdminToken, verifyAdminPassword, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';

const ATTEMPTS = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const now = Date.now();
  const entry = ATTEMPTS.get(ip);
  if (entry && entry.blockedUntil > now) {
    const minutesLeft = Math.ceil((entry.blockedUntil - now) / 60_000);
    return NextResponse.json(
      { error: `Per daug bandymų. Bandykite po ${minutesLeft} min.` },
      { status: 429 },
    );
  }

  let body: { password: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  if (!verifyAdminPassword(body.password)) {
    const prev = ATTEMPTS.get(ip) ?? { count: 0, blockedUntil: 0 };
    const count = prev.count + 1;
    if (count >= MAX_ATTEMPTS) {
      ATTEMPTS.set(ip, { count, blockedUntil: now + BLOCK_MS });
    } else {
      ATTEMPTS.set(ip, { count, blockedUntil: 0 });
    }
    return NextResponse.json({ error: 'Neteisingas slaptažodis' }, { status: 401 });
  }

  ATTEMPTS.delete(ip);
  const token = await signAdminToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}
