import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Verify callback secret
    const callbackSecret = request.headers.get("X-Callback-Secret")
    const expectedSecret = process.env.CALLBACK_SECRET

    if (expectedSecret && callbackSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid callback secret" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Transcribe callback received:", JSON.stringify(body, null, 2))

    const transcriptData = Array.isArray(body) ? body[0] : body

    const { transcript_text, transcript, episode_title, transcription_id, metadata, status, jobId } = transcriptData

    const finalTranscript = transcript_text || transcript

    if (!finalTranscript && !jobId) {
      return NextResponse.json({ error: "Missing transcript or jobId" }, { status: 400 })
    }

    console.log("[v0] Transcript received, length:", finalTranscript?.length || 0)

    // In a production app, you would store this in a database
    // For now, we return the data for the client to handle
    return NextResponse.json({
      success: true,
      transcript: finalTranscript,
      episodeTitle: episode_title,
      transcriptionId: transcription_id,
      metadata,
      status: status || "completed",
      jobId,
    })
  } catch (error) {
    console.error("Transcribe callback error:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
