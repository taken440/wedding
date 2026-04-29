import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const ISSUER = 'wedding-admin';
const AUDIENCE = 'wedding-admin';
const EXPIRY = '24h';

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(EXPIRY)
    .sign(jwtSecret());
}

export async function verifyAdminToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload;
  } catch {
    return null;
  }
}

export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  // Constant-time comparison over the full length of both strings.
  // Pads the shorter string with NUL bytes so the loop always runs to maxLen,
  // preventing early-exit timing leaks.
  const maxLen = Math.max(input.length, expected.length);
  let diff = 0;
  for (let i = 0; i < maxLen; i++) {
    diff |= (input.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  // Include length in the comparison: different lengths must fail.
  diff |= input.length ^ expected.length;
  return diff === 0;
}

export const COOKIE_NAME = 'wg_admin';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24, // 24h
  path: '/',
};
