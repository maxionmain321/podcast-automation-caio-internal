/**
 * Cloudflare R2 utility functions for file operations
 * R2 is S3-compatible, so we use the AWS SDK with custom endpoint configuration
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export function getS3Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable not set")
  }

  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`

  return new S3Client({
    region: "auto", // R2 uses "auto"
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  })
}

/**
 * Generate a presigned URL for uploading to R2
 * @param key - R2 object key
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 300 = 5 minutes)
 */
export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
  const client = getS3Client()
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error("S3_BUCKET environment variable not set")
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ChecksumAlgorithm: undefined,
  })

  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Get the public URL for an R2 object
 * If you configured a custom domain, it uses that; otherwise falls back to default endpoint.
 */
export function getS3FileUrl(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL
  if (publicUrl) {
    return `${publicUrl}/${key}`
  }

  const bucket = process.env.S3_BUCKET
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!bucket || !accountId) {
    throw new Error("S3_BUCKET or CLOUDFLARE_ACCOUNT_ID not set")
  }

  return `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`
}
