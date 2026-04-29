import { NextResponse } from 'next/server';
import { putJsonMeta, resolveFileType } from '@/lib/r2';
import type { MetaFile } from '@/lib/r2';
import type { ConfirmRequest } from '@/types';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: ConfirmRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  const { uuid, key, filename, uploader, contentType, size } = body;

  // ── Field presence ────────────────────────────────────────────────────────
  if (!uuid || !key || !filename || !contentType || typeof size !== 'number') {
    return NextResponse.json({ error: 'Trūksta laukų' }, { status: 400 });
  }

  // ── UUID format ───────────────────────────────────────────────────────────
  if (!UUID_V4_RE.test(uuid)) {
    return NextResponse.json({ error: 'Netinkamas uuid' }, { status: 400 });
  }

  // ── Key structure: must be under uploads/ and must embed the uuid ─────────
  if (!key.startsWith('uploads/') || !key.includes(`/${uuid}/`)) {
    return NextResponse.json({ error: 'Netinkamas raktas' }, { status: 400 });
  }

  // ── Re-validate file type (same rules as /api/presign) ────────────────────
  const canonical = resolveFileType(filename, contentType);
  if (!canonical) {
    return NextResponse.json({ error: 'Netinkamas failo tipas' }, { status: 415 });
  }

  const meta: MetaFile = {
    uuid,
    key,
    filename: filename.trim().substring(0, 255),
    uploader: (uploader ?? '').trim().substring(0, 100) || 'Svečias',
    contentType: canonical, // store canonical, not client-provided
    size,
    uploadedAt: new Date().toISOString(),
  };

  try {
    await putJsonMeta(`meta/${uuid}.json`, meta);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[confirm] R2 error:', err);
    return NextResponse.json({ error: 'Nepavyko išsaugoti metaduomenų' }, { status: 500 });
  }
}
