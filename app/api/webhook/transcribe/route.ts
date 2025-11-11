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
    const { audio_url, file_url, episode_title, metadata } = body
    const audioUrl = audio_url || file_url

    if (!audioUrl) {
      return NextResponse.json({ error: "Missing audio_url or file_url" }, { status: 400 })
    }

    const webhookUrl = process.env.N8N_TRANSCRIBE_WEBHOOK
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (!webhookUrl) {
      return NextResponse.json({ error: "Transcription webhook not configured" }, { status: 500 })
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret && { "X-Webhook-Secret": webhookSecret }),
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        episode_title,
        metadata,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("n8n webhook error:", errorText)
      throw new Error("Transcription service error")
    }

    const data = await response.json()

    // Return the response from n8n (could be immediate transcript or jobId)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Transcribe webhook error:", error)
    return NextResponse.json({ error: "Failed to start transcription" }, { status: 500 })
  }
}
