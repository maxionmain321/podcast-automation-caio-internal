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

    console.log("[v0] n8n raw response:", JSON.stringify(rawData, null, 2))

    const data = Array.isArray(rawData) ? rawData[0] : rawData

    console.log("[v0] Parsed data structure:", {
      hasSuccess: !!data.success,
      hasTitles: !!data.titles,
      hasBlogPost: !!data.blog_post,
      hasShowNotes: !!data.show_notes,
    })

    if (!data.success || !data.titles || !data.blog_post || !data.show_notes) {
      console.error("[v0] Invalid n8n response structure:", JSON.stringify(data, null, 2))
      return NextResponse.json(
        {
          error: "Invalid response from content generation service",
          details: {
            hasSuccess: !!data.success,
            hasTitles: !!data.titles,
            hasBlogPost: !!data.blog_post,
            hasShowNotes: !!data.show_notes,
          },
        },
        { status: 500 },
      )
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
