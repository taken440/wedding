import { NextResponse } from 'next/server';
import { putJsonMeta } from '@/lib/r2';
import type { MetaFile } from '@/lib/r2';
import type { ConfirmRequest as ConfirmReq } from '@/types';

export async function POST(request: Request) {
  let body: ConfirmReq;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  const { uuid, key, filename, uploader, contentType, size } = body;

  if (!uuid || !key || !filename || !contentType || typeof size !== 'number') {
    return NextResponse.json({ error: 'Trūksta laukų' }, { status: 400 });
  }

  // Basic sanity: key must be inside uploads/
  if (!key.startsWith('uploads/')) {
    return NextResponse.json({ error: 'Netinkamas raktas' }, { status: 400 });
  }

  const meta: MetaFile = {
    uuid,
    key,
    filename,
    uploader: (uploader ?? '').trim().substring(0, 100) || 'Svečias',
    contentType,
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
