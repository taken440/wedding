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
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_ENDPOINT must be set.');
  }
  _r2 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _r2;
}

function bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error('R2_BUCKET_NAME not configured.');
  return b;
}

// ─── File type validation ─────────────────────────────────────────────────────
// Map: lowercase file extension → canonical MIME type.
// This is the single source of truth — both for allow-listing and for
// cross-validating the client-supplied Content-Type.

const EXT_TO_CANONICAL_MIME: Readonly<Record<string, string>> = {
  // Images
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
  heif: 'image/heif', tiff: 'image/tiff', tif: 'image/tiff',
  bmp: 'image/bmp',
  // Videos
  mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', webm: 'video/webm', mpg: 'video/mpeg',
  mpeg: 'video/mpeg', '3gp': 'video/3gpp', '3g2': 'video/3gpp2',
  wmv: 'video/x-ms-wmv', flv: 'video/x-flv', ogv: 'video/ogg',
  m4v: 'video/mp4', ts: 'video/mp2t',
};

// Non-standard but common MIME types browsers sometimes send → canonical form.
const MIME_NORMALIZE: Readonly<Record<string, string>> = {
  'image/jpg': 'image/jpeg',
  'video/x-m4v': 'video/mp4',
  'video/mp4v-es': 'video/mp4',
};

/**
 * Validates a file's extension against the client-provided MIME type.
 * Returns the canonical MIME type if valid, or null if the file should be rejected.
 *
 * Security note: we do NOT trust the client MIME alone. We derive the canonical
 * MIME from the file extension (server-side whitelist) and then verify the client
 * MIME normalises to the same value. This prevents extension-MIME spoofing.
 */
export function resolveFileType(filename: string, clientMime: string): string | null {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) return null; // no extension

  const ext = filename.slice(lastDot + 1).toLowerCase();
  const canonicalFromExt = EXT_TO_CANONICAL_MIME[ext];
  if (!canonicalFromExt) return null; // extension not in whitelist

  const normalizedClientMime =
    MIME_NORMALIZE[clientMime.toLowerCase()] ?? clientMime.toLowerCase();

  // Extension-derived MIME must match normalised client MIME.
  if (normalizedClientMime !== canonicalFromExt) return null;

  return canonicalFromExt;
}

export function isAllowedType(contentType: string): boolean {
  return Object.values(EXT_TO_CANONICAL_MIME).includes(contentType);
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
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export async function getPresignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn },
  );
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

// ─── Listing ──────────────────────────────────────────────────────────────────

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

// ─── Deletion ─────────────────────────────────────────────────────────────────

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
