import { NextResponse } from 'next/server';
import { getJsonMeta, deleteUpload } from '@/lib/r2';
import type { MetaFile } from '@/lib/r2';

// UUIDv4 regex — rejects anything that isn't a proper v4 UUID.
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request) {
  let body: { uuid?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  // ── Validate UUID ─────────────────────────────────────────────────────────
  if (typeof body.uuid !== 'string' || !UUID_V4_RE.test(body.uuid)) {
    return NextResponse.json({ error: 'Netinkamas uuid' }, { status: 400 });
  }
  const uuid = body.uuid;

  // ── Look up authoritative key from metadata — never trust client-supplied key
  const meta = await getJsonMeta<MetaFile>(`meta/${uuid}.json`);
  if (!meta) {
    return NextResponse.json({ error: 'Failas nerastas' }, { status: 404 });
  }

  // Sanity check: stored key must still match expected structure
  if (!meta.key.startsWith('uploads/') || !meta.key.includes(`/${uuid}/`)) {
    console.error(`[admin/delete] Corrupt meta for uuid=${uuid}, key=${meta.key}`);
    return NextResponse.json({ error: 'Metaduomenų klaida' }, { status: 500 });
  }

  try {
    await deleteUpload(uuid, meta.key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/delete] R2 error:', err);
    return NextResponse.json({ error: 'Nepavyko ištrinti failo' }, { status: 500 });
  }
}
