import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { transcript_text, episode_title, metadata, workflowId } = body

    console.log("[v0] Generate webhook called with workflowId:", workflowId)

    if (!transcript_text) {
      return NextResponse.json({ error: "Missing transcript_text" }, { status: 400 })
    }

    const webhookUrl = process.env.N8N_GENERATE_WEBHOOK
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (!webhookUrl) {
      console.error("[v0] N8N_GENERATE_WEBHOOK not configured")
      return NextResponse.json({ error: "Content generation webhook not configured" }, { status: 500 })
    }

    console.log("[v0] Triggering n8n webhook:", webhookUrl)

    const webhookPayload = {
      transcript_text,
      episode_title,
      metadata,
      workflow_id: workflowId,
      callback_url: `${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000"}/api/webhook/generate-callback`,
    }
    console.log("[v0] Webhook payload:", JSON.stringify(webhookPayload, null, 2))

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret && { "X-Webhook-Secret": webhookSecret }),
        },
        body: JSON.stringify(webhookPayload),
      })

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.error("[v0] n8n webhook failed:", webhookResponse.status, errorText)
        throw new Error(`n8n webhook returned ${webhookResponse.status}`)
      }

      console.log("[v0] n8n webhook triggered successfully")
    } catch (webhookError) {
      console.error("[v0] Failed to trigger n8n webhook:", webhookError)
      return NextResponse.json(
        {
          error: "Failed to trigger content generation workflow",
          details: webhookError instanceof Error ? webhookError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Return immediately after triggering
    return NextResponse.json({
      success: true,
      status: "processing",
      message: "Content generation started. Results will be available shortly.",
      workflowId,
    })
  } catch (error) {
    console.error("[v0] Generate webhook error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
