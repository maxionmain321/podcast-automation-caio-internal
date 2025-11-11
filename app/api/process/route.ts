export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes for large uploads

import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  console.log("[Process API] Request received")

  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth) {
      console.log("[Process API] Authentication failed")
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
    }

    const body = await request.json()
    const { filename, contentType, fileUrl } = body

    console.log("[Process API] Request details:", { filename, contentType, fileUrl })

    if (!filename || !contentType || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get environment variables
    const bucket = process.env.S3_BUCKET
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const publicUrl = process.env.S3_PUBLIC_URL
    const webhookUrl = process.env.N8N_TRANSCRIBE_WEBHOOK
    const webhookSecret = process.env.WEBHOOK_SECRET

    // Validate required env vars
    if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: "Storage configuration incomplete" }, { status: 500 })
    }

    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    // Generate public file URL
    let finalFileUrl: string
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const key = `podcasts/${timestamp}-${sanitizedFilename}`

    if (publicUrl) {
      finalFileUrl = `${publicUrl.replace(/\/$/, "")}/${key}`
    } else {
      finalFileUrl = `https://pub-${accountId}.r2.dev/${key}`
    }

    console.log("[Process API] Generated file URL:", finalFileUrl)

    // Trigger n8n webhook immediately
    console.log("[Process API] Triggering n8n webhook...")

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret && { "X-Webhook-Secret": webhookSecret }),
      },
      body: JSON.stringify({
        audio_url: finalFileUrl,
        episode_title: filename,
        metadata: {
          filename,
          size: 0,
        },
      }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error("[Process API] Webhook error:", errorText)
      throw new Error("Failed to trigger transcription webhook")
    }

    const webhookData = await webhookResponse.json()
    console.log("[Process API] Webhook response:", webhookData)

    return NextResponse.json({
      success: true,
      fileUrl: finalFileUrl,
      key,
      webhookResponse: webhookData,
    })
  } catch (error) {
    console.error("[Process API] Error:", error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Process failed: ${errMsg}`, success: false }, { status: 500 })
  }
}
