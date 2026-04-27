import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'insecure-dev-secret-change-in-production',
);

const PUBLIC_ADMIN_ROUTES = new Set(['/api/admin/login']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin/') && !PUBLIC_ADMIN_ROUTES.has(pathname)) {
    const token = request.cookies.get('wg_admin')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Neprisijungta' }, { status: 401 });
    }

    try {
      await jwtVerify(token, secret, {
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
