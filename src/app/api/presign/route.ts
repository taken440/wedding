import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPresignedPutUrl, isAllowedType, sanitizeFilename } from '@/lib/r2';
import type { PresignRequest, PresignResponse } from '@/types';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES ?? '5368709120', 10); // 5GB default
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 presigns per minute per IP
const ipMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipMap.get(ip);
  if (!entry || entry.resetAt < now) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Per daug užklausų. Bandykite vėliau.' }, { status: 429 });
  }

  let body: PresignRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  const { filename, contentType, size } = body;

  if (!filename || !contentType || typeof size !== 'number') {
    return NextResponse.json({ error: 'Trūksta laukų: filename, contentType, size' }, { status: 400 });
  }

  if (!isAllowedType(contentType)) {
    return NextResponse.json(
      {
        error:
          'Netinkamas failo tipas. Leistini formatai: nuotraukos (JPEG, PNG, HEIC, WebP, GIF, TIFF) ir vaizdo įrašai (MP4, MOV, AVI, MKV, WebM).',
      },
      { status: 415 },
    );
  }

  if (size > MAX_FILE_SIZE) {
    const maxGb = (MAX_FILE_SIZE / 1024 ** 3).toFixed(0);
    return NextResponse.json(
      { error: `Failas per didelis. Maksimalus dydis: ${maxGb} GB.` },
      { status: 413 },
    );
  }

  const uuid = uuidv4();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const safe = sanitizeFilename(filename);
  const key = `uploads/${year}/${month}/${day}/${uuid}/${safe}`;

  try {
    const uploadUrl = await getPresignedPutUrl(key, contentType);
    const response: PresignResponse = { uploadUrl, key, uuid };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[presign] R2 error:', err);
    return NextResponse.json({ error: 'Nepavyko sugeneruoti įkėlimo URL' }, { status: 500 });
  }
}
