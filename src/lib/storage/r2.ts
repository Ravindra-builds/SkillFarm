import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 Client Configuration & Helpers
 *
 * Environment variables:
 * - CLOUDFLARE_ACCOUNT_ID (or R2_ACCOUNT_ID): Cloudflare account ID
 * - R2_ACCESS_KEY_ID: S3 API token access key ID
 * - R2_SECRET_ACCESS_KEY: S3 API token secret access key
 * - R2_BUCKET_NAME: Target bucket name
 * - R2_PUBLIC_URL: (Optional) Public CDN URL or custom domain (e.g. https://pub-xxx.r2.dev)
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

/**
 * Validates whether Cloudflare R2 credentials are fully configured.
 */
export function isR2Configured(): boolean {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

/**
 * Retrieves the configured R2 configuration or returns null.
 */
export function getR2Config(): R2Config | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl?.replace(/\/$/, ""),
  };
}

let cachedS3Client: S3Client | null = null;

/**
 * Initializes and caches an S3 client configured for Cloudflare R2 endpoint.
 */
export function getR2Client(): S3Client | null {
  const config = getR2Config();
  if (!config) return null;

  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return cachedS3Client;
}

/**
 * Sanitizes a filename to prevent path traversal and unsafe characters.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.+/g, ".")
    .slice(0, 100);
}

/**
 * Uploads a file (PDF, TXT, etc.) to Cloudflare R2 storage.
 *
 * @param params Object containing userId, fileBuffer, fileName, and contentType
 * @returns Object with storageKey and publicUrl, or null if R2 is not configured
 */
export async function uploadFileToR2(params: {
  userId: string;
  fileBuffer: Buffer | Uint8Array;
  fileName: string;
  contentType: string;
}): Promise<{ key: string; url: string | null } | null> {
  const config = getR2Config();
  const client = getR2Client();

  if (!config || !client) {
    console.warn("[r2] Cloudflare R2 is not configured. Skipping object upload.");
    return null;
  }

  const safeName = sanitizeFileName(params.fileName || "resume.pdf");
  const timestamp = Date.now();
  const safeUserId = params.userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `resumes/${safeUserId}/${timestamp}-${safeName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: params.fileBuffer,
      ContentType: params.contentType,
      Metadata: {
        userId: params.userId,
        uploadedAt: new Date().toISOString(),
        originalFileName: safeName,
      },
    });

    await client.send(command);

    const url = config.publicUrl ? `${config.publicUrl}/${key}` : null;

    return {
      key,
      url,
    };
  } catch (err) {
    console.error("[r2] Error uploading file to Cloudflare R2:", err);
    throw new Error(err instanceof Error ? `R2 upload failed: ${err.message}` : "Failed to upload file to R2");
  }
}

/**
 * Deletes a file from Cloudflare R2 storage by its key.
 */
export async function deleteFileFromR2(key: string): Promise<boolean> {
  const config = getR2Config();
  const client = getR2Client();

  if (!config || !client) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (err) {
    console.error("[r2] Error deleting file from Cloudflare R2:", err);
    return false;
  }
}
