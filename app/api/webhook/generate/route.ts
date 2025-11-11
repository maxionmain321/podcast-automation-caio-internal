import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { transcript_text, episode_title, metadata, workflow_id } = body

    if (!transcript_text) {
      return NextResponse.json({ error: "Missing transcript_text" }, { status: 400 })
    }

    if (!workflow_id) {
      return NextResponse.json({ error: "Missing workflow_id" }, { status: 400 })
    }

    const webhookUrl = process.env.N8N_GENERATE_WEBHOOK
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (!webhookUrl) {
      return NextResponse.json({ error: "Content generation webhook not configured" }, { status: 500 })
    }

    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret && { "X-Webhook-Secret": webhookSecret }),
      },
      body: JSON.stringify({
        transcript_text,
        episode_title,
        metadata,
        workflow_id, // Send workflow_id so n8n knows where to POST back
      }),
    }).catch((err) => {
      console.error("[v0] Failed to trigger n8n webhook:", err)
    })

    return NextResponse.json({
      success: true,
      status: "processing",
      message: "Content generation started. Results will be available shortly.",
      workflow_id,
    })
  } catch (error) {
    console.error("Generate webhook error:", error)
    return NextResponse.json({ error: "Failed to start content generation" }, { status: 500 })
  }
}
