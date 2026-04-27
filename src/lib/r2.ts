import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ─── Lazy singleton client ────────────────────────────────────────────────────
let _r2: S3Client | null = null;

function client(): S3Client {
  if (_r2) return _r2;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.',
    );
  }
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _r2;
}

function bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error('R2_BUCKET_NAME not configured.');
  return b;
}

// ─── Allowed types ────────────────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'image/heic', 'image/heif', 'image/tiff', 'image/bmp', 'image/raw',
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
  'video/webm', 'video/mpeg', 'video/3gpp', 'video/3gpp2',
  'video/x-ms-wmv', 'video/x-flv', 'video/ogg',
]);

export function isAllowedType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType) || ALLOWED_VIDEO_TYPES.has(contentType);
}

export function isImage(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export function isVideo(contentType: string): boolean {
  return ALLOWED_VIDEO_TYPES.has(contentType);
}

export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
}

// ─── R2 operations ────────────────────────────────────────────────────────────
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), command, { expiresIn });
}

export async function getPresignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(client(), command, { expiresIn });
}

export async function putJsonMeta(key: string, data: object): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }),
  );
}

export async function getJsonMeta<T>(key: string): Promise<T | null> {
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    const text = await res.Body?.transformToString();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MetaFile {
  uuid: string;
  key: string;
  filename: string;
  uploader: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

// ─── Listing & deletion ───────────────────────────────────────────────────────
export async function listMetaFiles(): Promise<MetaFile[]> {
  const all: MetaFile[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await client().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: 'meta/',
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );

    const keys = (res.Contents ?? []).map((o) => o.Key!).filter(Boolean);

    // Fetch meta JSONs in parallel, 20 at a time
    for (let i = 0; i < keys.length; i += 20) {
      const chunk = keys.slice(i, i + 20);
      const results = await Promise.allSettled(chunk.map((k) => getJsonMeta<MetaFile>(k)));
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) all.push(r.value);
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  all.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return all;
}

export async function deleteUpload(uuid: string, fileKey: string): Promise<void> {
  await client().send(
    new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: {
        Objects: [{ Key: fileKey }, { Key: `meta/${uuid}.json` }],
        Quiet: true,
      },
    }),
  );
}
