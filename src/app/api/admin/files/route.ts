import { NextResponse } from 'next/server';
import { listMetaFiles, getPresignedGetUrl } from '@/lib/r2';
import type { AdminFilesResponse } from '@/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') ?? 'all'; // all | images | videos
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const pageSize = 48;

  try {
    let files = await listMetaFiles();

    if (filter === 'images') {
      files = files.filter((f) => f.contentType.startsWith('image/'));
    } else if (filter === 'videos') {
      files = files.filter((f) => f.contentType.startsWith('video/'));
    }

    const total = files.length;
    const paged = files.slice((page - 1) * pageSize, page * pageSize);

    // Attach presigned view URLs (1h expiry)
    const withUrls = await Promise.all(
      paged.map(async (f) => ({
        ...f,
        viewUrl: await getPresignedGetUrl(f.key, 3600),
      })),
    );

    const body: AdminFilesResponse = { files: withUrls, total };
    return NextResponse.json(body);
  } catch (err) {
    console.error('[admin/files] error:', err);
    return NextResponse.json({ error: 'Nepavyko gauti failų sąrašo' }, { status: 500 });
  }
}
