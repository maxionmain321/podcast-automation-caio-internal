export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes for large uploads

import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export async function POST(request: NextRequest) {
  console.log("[Upload API] Request received")

  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth) {
      console.log("[Upload API] Authentication failed")
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.log("[Upload API] Authentication successful")

    const body = await request.json()
    const { filename, contentType } = body

    console.log("[Upload API] Request details:", { filename, contentType })

    // Validate inputs
    if (!filename || !contentType) {
      console.log("[Upload API] Missing required fields")
      return NextResponse.json({ error: "Missing filename or contentType", success: false }, { status: 400 })
    }

    // Get environment variables
    const bucket = process.env.S3_BUCKET
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const publicUrl = process.env.S3_PUBLIC_URL

    console.log("[Upload API] Environment check:", {
      hasBucket: !!bucket,
      hasAccountId: !!accountId,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      hasPublicUrl: !!publicUrl,
      bucket: bucket,
      accountId: accountId ? `${accountId.substring(0, 8)}...` : "missing",
      publicUrl: publicUrl,
    })

    // Validate all required env vars
    if (!bucket) {
      return NextResponse.json({ error: "S3_BUCKET not configured", success: false }, { status: 500 })
    }
    if (!accountId) {
      return NextResponse.json({ error: "CLOUDFLARE_ACCOUNT_ID not configured", success: false }, { status: 500 })
    }
    if (!accessKeyId) {
      return NextResponse.json({ error: "AWS_ACCESS_KEY_ID not configured", success: false }, { status: 500 })
    }
    if (!secretAccessKey) {
      return NextResponse.json({ error: "AWS_SECRET_ACCESS_KEY not configured", success: false }, { status: 500 })
    }

    // Generate unique key with timestamp
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `podcasts/${timestamp}-${sanitizedFilename}`
    console.log("[Upload API] Generated key:", key)

    // Initialize S3 client for CloudFlare R2
    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // CloudFlare R2 doesn't support checksum validation in serverless environment
      requestChecksumCalculation: "WHEN_REQUIRED",
    })

    console.log("[Upload API] S3 Client initialized")

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ChecksumAlgorithm: undefined, // Disable checksum for R2 compatibility
    })

    console.log("[Upload API] Generating presigned URL...")
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    })

    console.log("[Upload API] Presigned URL generated successfully")

    // Generate public file URL
    // Priority: Use S3_PUBLIC_URL env var (custom domain), otherwise use R2 endpoint
    let fileUrl: string

    if (publicUrl) {
      // Custom domain (e.g., https://podcast.files.chiefaiofficer.com)
      fileUrl = `${publicUrl.replace(/\/$/, "")}/${key}` // Remove trailing slash if present
      console.log("[Upload API] Using custom domain URL:", fileUrl)
    } else {
      // Fallback to R2 public endpoint (requires Public Access enabled)
      // Note: This won't work if bucket is private - you MUST set S3_PUBLIC_URL
      fileUrl = `https://pub-${accountId}.r2.dev/${key}`
      console.warn("[Upload API] WARNING: S3_PUBLIC_URL not set, using R2 public URL (this may not work if bucket is private)")
      console.log("[Upload API] Fallback URL:", fileUrl)
    }

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
      success: true,
    })
  } catch (error) {
    console.error("[Upload API] Error:", error)
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error("[Upload API] Error name:", error.name)
      console.error("[Upload API] Error message:", error.message)
      console.error("[Upload API] Error stack:", error.stack)
    }

    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: `Upload failed: ${errMsg}`, 
        success: false,
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
