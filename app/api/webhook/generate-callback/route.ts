import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Generate callback received:", {
      hasSuccess: !!body.success,
      hasTitles: !!body.titles,
      hasBlogPost: !!body.blog_post,
      hasShowNotes: !!body.show_notes,
      workflowId: body.workflowId,
    })

    const data = Array.isArray(body) ? body[0] : body

    if (!data.success || !data.titles || !data.blog_post || !data.show_notes) {
      console.error("[v0] Invalid callback structure:", JSON.stringify(data, null, 2))
      return NextResponse.json({ error: "Invalid response structure" }, { status: 400 })
    }

    // Store the result in localStorage on the client side via polling
    // The client will poll for updates and retrieve this data

    return NextResponse.json({ success: true, message: "Content generation complete" })
  } catch (error) {
    console.error("Generate callback error:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
