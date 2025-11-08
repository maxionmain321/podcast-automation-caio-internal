export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes for large uploads

import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

export async function POST(request: NextRequest) {
  console.log("[v0] Upload API called")

  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth) {
      console.log("[v0] Authentication failed")
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }
    console.log("[v0] Authentication successful")

    const body = await request.json()
    const { filename, contentType } = body

    console.log("[v0] Presigned URL request:", { filename, contentType })

    // Validate inputs
    if (!filename || !contentType) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Missing required fields", success: false }, { status: 400 })
    }

    const bucket = process.env.S3_BUCKET
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    console.log("[v0] Environment check:", {
      hasBucket: !!bucket,
      hasAccountId: !!accountId,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
    })

    if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
      console.log("[v0] Missing environment variables")
      return NextResponse.json({ error: "Storage not configured", success: false }, { status: 500 })
    }

    // Generate unique key
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `podcasts/${timestamp}-${sanitizedFilename}`
    console.log("[v0] Generated key:", key)

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Checksum calculation disabled for large file uploads to Cloudflare R2
      // to avoid unsupported zlib.crc32 error in serverless runtime
      requestChecksumCalculation: "WHEN_REQUIRED",
    })

    console.log("[v0] Generating presigned URL...")

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // Checksum calculation disabled for large file uploads to Cloudflare R2
      // to avoid unsupported zlib.crc32 error in serverless runtime
      ChecksumAlgorithm: undefined,
    })

    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner")
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    })

    console.log("[v0] Presigned URL generated successfully")

    const publicUrl = process.env.S3_PUBLIC_URL
    const fileUrl = publicUrl ? `${publicUrl}/${key}` : `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`

    console.log("[v0] File URL:", fileUrl)

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Upload failed: ${errMsg}`, success: false }, { status: 500 })
  }
}
