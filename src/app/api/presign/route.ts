import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPresignedPutUrl, resolveFileType, sanitizeFilename } from '@/lib/r2';
import { checkPresignRateLimit } from '@/lib/ratelimit';
import type { PresignRequest, PresignResponse } from '@/types';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES ?? '5368709120', 10); // 5 GB

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(request: Request) {
  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = await checkPresignRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Per daug užklausų. Bandykite vėliau.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: PresignRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  const { filename, contentType, size } = body;

  if (
    !filename || typeof filename !== 'string' ||
    !contentType || typeof contentType !== 'string' ||
    typeof size !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Trūksta laukų: filename, contentType, size' },
      { status: 400 },
    );
  }

  // ── File type: cross-validate extension vs client MIME ────────────────────
  // resolveFileType derives the canonical MIME from the extension (server-side
  // whitelist) and checks the client's MIME normalises to the same value.
  // We use the canonical MIME — not the client's — in the presigned URL.
  const canonical = resolveFileType(filename.trim(), contentType.trim());
  if (!canonical) {
    return NextResponse.json(
      {
        error:
          'Netinkamas failo tipas arba plėtinys neatitinka turinio tipo. ' +
          'Leistini: JPEG, PNG, HEIC, WebP, GIF, TIFF, BMP (nuotraukos) ir ' +
          'MP4, MOV, AVI, MKV, WebM, 3GP (vaizdo įrašai).',
      },
      { status: 415 },
    );
  }

  // ── Size check ────────────────────────────────────────────────────────────
  if (size <= 0 || size > MAX_FILE_SIZE) {
    const maxGb = (MAX_FILE_SIZE / 1024 ** 3).toFixed(0);
    return NextResponse.json(
      { error: `Failas per didelis. Maksimalus dydis: ${maxGb} GB.` },
      { status: 413 },
    );
  }

  // ── Generate key ──────────────────────────────────────────────────────────
  const uuid = uuidv4();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const safe = sanitizeFilename(filename.trim());
  const key = `uploads/${year}/${month}/${day}/${uuid}/${safe}`;

  // ── Presign PUT with canonical MIME ───────────────────────────────────────
  try {
    const uploadUrl = await getPresignedPutUrl(key, canonical);
    const response: PresignResponse = { uploadUrl, key, uuid };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[presign] R2 error:', err);
    return NextResponse.json({ error: 'Nepavyko sugeneruoti įkėlimo URL' }, { status: 500 });
  }
}
