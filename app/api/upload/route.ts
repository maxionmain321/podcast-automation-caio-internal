export const runtime = "nodejs"
export const maxDuration = 60 // Maximum allowed on Vercel

import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

async function createPresignedUrl(
  bucket: string,
  key: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const region = "auto"
  const service = "s3"
  const method = "PUT"
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const host = `${accountId}.r2.cloudflarestorage.com`

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.substring(0, 8)

  const canonicalUri = `/${bucket}/${key}`
  const canonicalQuerystring = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ].join("&")

  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = "host"
  const payloadHash = "UNSIGNED-PAYLOAD"

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const encoder = new TextEncoder()
  const canonicalRequestHash = await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest))
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, canonicalRequestHashHex].join("\n")

  async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
    const keyData = typeof key === "string" ? encoder.encode(key) : key
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
    return new Uint8Array(signature)
  }

  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  const kSigning = await hmac(kService, "aws4_request")
  const signature = await hmac(kSigning, stringToSign)

  const signatureHex = Array.from(signature)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return `${endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`
}

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

    console.log("[Upload API] Generating presigned URL with Web Crypto...")
    const uploadUrl = await createPresignedUrl(bucket, key, accountId, accessKeyId, secretAccessKey, contentType, 3600)

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
      console.warn(
        "[Upload API] WARNING: S3_PUBLIC_URL not set, using R2 public URL (this may not work if bucket is private)",
      )
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
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  console.log("[Upload API] PUT request received for direct upload")

  try {
    const auth = await verifyAuth()
    if (!auth) {
      console.log("[Upload API] Authentication failed")
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream"
    const filename = request.headers.get("x-filename") || "upload"

    console.log("[Upload API] Direct upload details:", { filename, contentType })

    // Get environment variables
    const bucket = process.env.S3_BUCKET
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const publicUrl = process.env.S3_PUBLIC_URL

    if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: "Server configuration missing", success: false }, { status: 500 })
    }

    // Generate unique key
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `podcasts/${timestamp}-${sanitizedFilename}`

    console.log("[Upload API] Uploading to R2 with key:", key)

    // Generate presigned URL for server-side upload
    const uploadUrl = await createPresignedUrl(bucket, key, accountId, accessKeyId, secretAccessKey, contentType, 300)

    // Upload file to R2
    const fileBuffer = await request.arrayBuffer()
    console.log("[Upload API] File size:", fileBuffer.byteLength, "bytes")

    const r2Response = await fetch(uploadUrl, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": contentType,
      },
    })

    if (!r2Response.ok) {
      const errorText = await r2Response.text()
      console.error("[Upload API] R2 upload failed:", r2Response.status, errorText)
      throw new Error(`R2 upload failed: ${r2Response.status}`)
    }

    console.log("[Upload API] File uploaded successfully to R2")

    // Generate public file URL
    const fileUrl = publicUrl ? `${publicUrl.replace(/\/$/, "")}/${key}` : `https://pub-${accountId}.r2.dev/${key}`

    return NextResponse.json({
      fileUrl,
      key,
      success: true,
    })
  } catch (error) {
    console.error("[Upload API] PUT Error:", error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: `Upload failed: ${errMsg}`,
        success: false,
      },
      { status: 500 },
    )
  }
}
