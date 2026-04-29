import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that don't require a valid JWT (but may still be CSRF-checked)
const PUBLIC_ADMIN_ROUTES = new Set(['/api/admin/login']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (!pathname.startsWith('/api/admin/')) return NextResponse.next();

  // ── CSRF: Origin must match APP_ORIGIN for all mutating requests ──────────
  // Applies to every /api/admin/* route including /login.
  // GET / HEAD / OPTIONS are safe methods and exempt.
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const appOrigin = process.env.APP_ORIGIN;
    if (appOrigin) {
      const origin = request.headers.get('origin');
      if (!origin || origin !== appOrigin) {
        return NextResponse.json({ error: 'Draudžiamas šaltinis' }, { status: 403 });
      }
    }
    // If APP_ORIGIN is not set we are in development; skip CSRF.
    // In production, env.ts startup validation ensures APP_ORIGIN is present.
  }

  // ── JWT: protect every route except login ─────────────────────────────────
  if (!PUBLIC_ADMIN_ROUTES.has(pathname)) {
    const token = request.cookies.get('wg_admin')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Neprisijungta' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Serverio konfigūracijos klaida' }, { status: 500 });
    }

    try {
      await jwtVerify(token, new TextEncoder().encode(secret), {
        issuer: 'wedding-admin',
        audience: 'wedding-admin',
      });
    } catch {
      const res = NextResponse.json({ error: 'Sesija baigėsi' }, { status: 401 });
      res.cookies.delete('wg_admin');
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/admin/:path*',
};
