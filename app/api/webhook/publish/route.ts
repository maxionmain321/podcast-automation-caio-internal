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
    const {
      seo_title,
      blog_post_markdown,
      primary_keyword,
      secondary_keywords,
      wordpress_category,
      tags,
      publish_immediately,
    } = body

    console.log("[v0] Publish request received:", {
      seo_title,
      blog_post_length: blog_post_markdown?.length || 0,
      primary_keyword,
      secondary_keywords,
    })

    if (!seo_title || !blog_post_markdown) {
      console.log("[v0] Missing required fields:", { seo_title: !!seo_title, blog_post_markdown: !!blog_post_markdown })
      return NextResponse.json({ error: "Missing required fields: seo_title and blog_post_markdown" }, { status: 400 })
    }

    const webhookUrl = process.env.N8N_PUBLISH_WEBHOOK
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (!webhookUrl) {
      return NextResponse.json({ error: "Publishing webhook not configured" }, { status: 500 })
    }

    // Proxy request to n8n webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret && { "X-Webhook-Secret": webhookSecret }),
      },
      body: JSON.stringify({
        seo_title,
        blog_post_markdown,
        primary_keyword,
        secondary_keywords,
        wordpress_category: wordpress_category || "Podcast",
        tags: tags || [],
        publish_immediately: publish_immediately !== false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("n8n publish webhook error:", errorText)
      throw new Error("Publishing service error")
    }

    const data = await response.json()

    // Validate response
    if (!data.success) {
      throw new Error(data.error || "Publishing failed")
    }

    return NextResponse.json({
      success: true,
      postUrl: data.postUrl || data.post_url,
      postId: data.postId || data.post_id,
    })
  } catch (error) {
    console.error("Publish webhook error:", error)
    return NextResponse.json({ error: "Failed to publish content" }, { status: 500 })
  }
}
