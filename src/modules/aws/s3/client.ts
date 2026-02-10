import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type S3ClientConfig,
  type _Object,
} from '@aws-sdk/client-s3';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default temp folder for downloads (within module directory) */
export const DEFAULT_TEMP_FOLDER = resolve(__dirname.replace('/dist/', '/src/'), '.temp');

/** Default bucket for receipts */
export const DEFAULT_BUCKET = process.env['S3_BUCKET'] ?? 'my-bucket';

/** Default prefix for receipts */
export const DEFAULT_RECEIPTS_PREFIX = 'receipts/';

/** S3 object metadata */
export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

/** S3 object with content */
export interface S3ObjectWithContent extends S3Object {
  contentType: string;
  body: Buffer;
}

let cachedClient: S3Client | null = null;

/**
 * Get S3 client
 * Uses default credential chain (env vars, ~/.aws/credentials, IAM role, etc.)
 */
function getS3Client(): S3Client {
  if (cachedClient !== null) {
    return cachedClient;
  }

  const config: S3ClientConfig = {
    // Region can be set via AWS_REGION env var or defaults to us-east-1
    region: process.env['AWS_REGION'] ?? 'eu-west-1',
  };

  cachedClient = new S3Client(config);
  return cachedClient;
}

/**
 * List objects in a bucket with optional prefix
 */
export async function listObjects(
  bucket: string,
  prefix?: string,
  maxKeys?: number
): Promise<S3Object[]> {
  const client = getS3Client();

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: maxKeys ?? 100,
  });

  const response = await client.send(command);
  const contents = response.Contents ?? [];

  return contents
    .filter((obj): obj is _Object & { Key: string } => obj.Key !== undefined)
    .map((obj) => ({
      key: obj.Key,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified ?? new Date(),
      etag: obj.ETag ?? '',
    }));
}

/**
 * Get object metadata (head object)
 */
export async function headObject(bucket: string, key: string): Promise<S3Object> {
  const client = getS3Client();

  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);

  return {
    key,
    size: response.ContentLength ?? 0,
    lastModified: response.LastModified ?? new Date(),
    etag: response.ETag ?? '',
  };
}

/**
 * Download object content
 */
export async function getObject(bucket: string, key: string): Promise<S3ObjectWithContent> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);

  if (response.Body === undefined) {
    throw new Error(`Empty response body for ${key}`);
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  return {
    key,
    size: response.ContentLength ?? body.length,
    lastModified: response.LastModified ?? new Date(),
    etag: response.ETag ?? '',
    contentType: response.ContentType ?? 'application/octet-stream',
    body,
  };
}

/**
 * Download object to local file
 */
export async function downloadObject(
  bucket: string,
  key: string,
  localPath: string
): Promise<string> {
  const obj = await getObject(bucket, key);

  // Ensure directory exists
  const dir = dirname(localPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(localPath, obj.body);
  return localPath;
}

/**
 * Download object to temp folder
 */
export async function downloadObjectToTemp(bucket: string, key: string): Promise<string> {
  // Ensure temp folder exists
  if (!existsSync(DEFAULT_TEMP_FOLDER)) {
    mkdirSync(DEFAULT_TEMP_FOLDER, { recursive: true });
  }

  const filename = basename(key);
  const localPath = resolve(DEFAULT_TEMP_FOLDER, filename);
  return downloadObject(bucket, key, localPath);
}

/**
 * Upload content to S3
 */
export async function putObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType?: string
): Promise<void> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
}

/**
 * Upload local file to S3
 */
export async function uploadFile(
  bucket: string,
  key: string,
  localPath: string,
  contentType?: string
): Promise<void> {
  const body = readFileSync(localPath);
  await putObject(bucket, key, body, contentType);
}

/**
 * Copy object within S3 (used for rename/move)
 */
export async function copyObject(
  bucket: string,
  sourceKey: string,
  destKey: string
): Promise<void> {
  const client = getS3Client();

  const command = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${sourceKey}`,
    Key: destKey,
  });

  await client.send(command);
}

/**
 * Delete object
 */
export async function deleteObject(bucket: string, key: string): Promise<void> {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Rename object (copy + delete)
 */
export async function renameObject(
  bucket: string,
  sourceKey: string,
  destKey: string
): Promise<void> {
  await copyObject(bucket, sourceKey, destKey);
  await deleteObject(bucket, sourceKey);
}

/**
 * Move object to different prefix (copy + delete)
 */
export async function moveObject(
  bucket: string,
  sourceKey: string,
  destPrefix: string
): Promise<string> {
  const filename = basename(sourceKey);
  const destKey = destPrefix.endsWith('/') ? `${destPrefix}${filename}` : `${destPrefix}/${filename}`;

  await copyObject(bucket, sourceKey, destKey);
  await deleteObject(bucket, sourceKey);

  return destKey;
}

/**
 * List receipt photos from the inbox prefix
 */
export async function listReceiptPhotos(
  bucket: string = DEFAULT_BUCKET,
  prefix: string = `${DEFAULT_RECEIPTS_PREFIX}inbox/`
): Promise<S3Object[]> {
  const objects = await listObjects(bucket, prefix);

  // Filter to only image files
  return objects.filter((obj) => {
    const key = obj.key.toLowerCase();
    return (
      key.endsWith('.jpg') ||
      key.endsWith('.jpeg') ||
      key.endsWith('.png') ||
      key.endsWith('.heic')
    );
  });
}

/**
 * Generate a suggested receipt filename from S3 object metadata
 * Format: restaurant-month-year.ext (e.g., unknown-january-2025.jpg)
 */
export function generateReceiptFilename(obj: S3Object): string {
  const date = obj.lastModified;
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();

  // Get extension from original key
  const ext = obj.key.includes('.') ? obj.key.split('.').pop()?.toLowerCase() ?? '' : '';
  const extension = ext !== '' ? `.${ext}` : '';

  return `unknown-${month}-${year}${extension}`;
}

/**
 * Organize receipt photos - rename and move to organized prefix
 */
export async function organizeReceipts(
  bucket: string,
  keys: string[],
  newNames: string[],
  organizedPrefix: string = `${DEFAULT_RECEIPTS_PREFIX}organized/`
): Promise<{ key: string; newKey: string; success: boolean; error?: string }[]> {
  const results: { key: string; newKey: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < keys.length; i++) {
    const sourceKey = keys[i];
    const newName = newNames[i];

    if (sourceKey === undefined || newName === undefined) {
      continue;
    }

    // Get extension from original key
    const ext = sourceKey.includes('.') ? `.${sourceKey.split('.').pop()}` : '';
    const destKey = `${organizedPrefix}${newName}${ext}`;

    try {
      await renameObject(bucket, sourceKey, destKey);
      results.push({ key: sourceKey, newKey: destKey, success: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      results.push({ key: sourceKey, newKey: destKey, success: false, error: errMsg });
    }
  }

  return results;
}
