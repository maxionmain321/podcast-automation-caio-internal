import { type NextRequest, NextResponse } from "next/server"

// This endpoint receives callbacks from n8n with completed transcripts
export async function POST(request: NextRequest) {
  try {
    // Verify callback secret
    const callbackSecret = request.headers.get("X-Callback-Secret")
    const expectedSecret = process.env.CALLBACK_SECRET

    if (expectedSecret && callbackSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid callback secret" }, { status: 401 })
    }

    const { jobId, transcript, status, error } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
    }

    // In a production app, you would store this in a database
    // For now, we'll just acknowledge receipt
    // The client will poll /api/transcription-status to get the result

    console.log("Received transcription callback:", { jobId, status, transcriptLength: transcript?.length })

    return NextResponse.json({
      success: true,
      message: "Callback received",
    })
  } catch (error) {
    console.error("Transcribe callback error:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
