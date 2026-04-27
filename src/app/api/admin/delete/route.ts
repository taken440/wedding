import { NextResponse } from 'next/server';
import { deleteUpload } from '@/lib/r2';

export async function DELETE(request: Request) {
  let body: { uuid: string; key: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neteisinga užklausa' }, { status: 400 });
  }

  const { uuid, key } = body;

  if (!uuid || !key) {
    return NextResponse.json({ error: 'Trūksta uuid arba key' }, { status: 400 });
  }

  if (!key.startsWith('uploads/')) {
    return NextResponse.json({ error: 'Netinkamas raktas' }, { status: 400 });
  }

  try {
    await deleteUpload(uuid, key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/delete] error:', err);
    return NextResponse.json({ error: 'Nepavyko ištrinti failo' }, { status: 500 });
  }
}
