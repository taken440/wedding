import { NextResponse } from 'next/server';
import { getPresignedGetUrl } from '@/lib/r2';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Trūksta key parametro' }, { status: 400 });
  }

  if (!key.startsWith('uploads/')) {
    return NextResponse.json({ error: 'Netinkamas raktas' }, { status: 400 });
  }

  try {
    const viewUrl = await getPresignedGetUrl(key, 3600);
    return NextResponse.json({ url: viewUrl });
  } catch (err) {
    console.error('[admin/view] error:', err);
    return NextResponse.json({ error: 'Nepavyko gauti nuorodos' }, { status: 500 });
  }
}
