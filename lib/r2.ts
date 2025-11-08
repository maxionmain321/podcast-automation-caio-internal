/**
 * Cloudflare R2 Configuration Notes
 *
 * This file documents R2-specific configuration for the podcast automation app.
 * R2 is Cloudflare's S3-compatible object storage service.
 *
 * Key Differences from AWS S3:
 * - Region is always "auto" (not a specific AWS region)
 * - Endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 * - Uses R2 API tokens (not AWS IAM credentials, but same format)
 * - No egress fees (bandwidth is free)
 *
 * Unsupported S3 Features in R2:
 * - Bucket ACLs (use R2 API tokens for access control)
 * - Object versioning
 * - Server-side encryption configuration (R2 encrypts by default)
 * - Bucket policies (use R2 API token permissions)
 * - S3 Transfer Acceleration
 * - S3 Select
 * - Requester Pays
 *
 * Environment Variables Required:
 * - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
 * - AWS_ACCESS_KEY_ID: R2 Access Key ID (from R2 API tokens)
 * - AWS_SECRET_ACCESS_KEY: R2 Secret Access Key (from R2 API tokens)
 * - S3_BUCKET: Your R2 bucket name
 *
 * Public Access:
 * - By default, R2 buckets are private
 * - Configure custom domains in Cloudflare dashboard for public access
 * - Or use R2.dev subdomain (if enabled in bucket settings)
 *
 * CORS Configuration:
 * - Configure CORS in R2 dashboard if browser uploads are needed
 * - Similar to S3 CORS configuration format
 *
 * For more information:
 * https://developers.cloudflare.com/r2/
 */

export const R2_CONFIG = {
  region: "auto",
  endpointPattern: "https://227fb688d5e51e765ac27e745b3660a9.r2.cloudflarestorage.com",
} as const

// The actual R2 client is configured in lib/s3.ts
// We keep the filename as s3.ts for compatibility with existing code
