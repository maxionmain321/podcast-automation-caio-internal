import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
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

    // Proxy request to n8n webhook
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

    const data = await response.json()

    // Validate response structure
    if (!data.seo_title || !data.blog_post_html || !data.show_notes_html) {
      console.error("Invalid n8n response structure:", data)
      throw new Error("Invalid response from content generation service")
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Generate webhook error:", error)
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 })
  }
}
