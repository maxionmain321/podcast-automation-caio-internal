import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { transcript_text, episode_title, metadata } = body

    if (!transcript_text) {
      return NextResponse.json({ error: "Missing transcript_text" }, { status: 400 })
    }

    const webhookUrl = process.env.N8N_GENERATE_WEBHOOK
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (!webhookUrl) {
      return NextResponse.json({ error: "Content generation webhook not configured" }, { status: 500 })
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret && { "X-Webhook-Secret": webhookSecret }),
      },
      body: JSON.stringify({
        transcript_text,
        episode_title,
        metadata,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("n8n generate webhook error:", errorText)
      throw new Error("Content generation service error")
    }

    const rawData = await response.json()

    const data = Array.isArray(rawData) ? rawData[0] : rawData

    if (!data.success || !data.titles || !data.blog_post || !data.show_notes) {
      console.error("Invalid n8n response structure:", data)
      throw new Error("Invalid response from content generation service")
    }

    return NextResponse.json({
      success: true,
      titles: data.titles,
      blog_post: data.blog_post,
      show_notes: data.show_notes,
      metadata: data.metadata,
    })
  } catch (error) {
    console.error("Generate webhook error:", error)
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 })
  }
}
