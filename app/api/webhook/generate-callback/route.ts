import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflow_id, success, titles, blog_post, show_notes, metadata } = body

    console.log("[v0] Generate callback received for workflow:", workflow_id)
    console.log("[v0] Callback data structure:", {
      hasSuccess: !!success,
      hasTitles: !!titles,
      hasBlogPost: !!blog_post,
      hasShowNotes: !!show_notes,
    })

    if (!workflow_id) {
      return NextResponse.json({ error: "Missing workflow_id" }, { status: 400 })
    }

    const data = Array.isArray(body) ? body[0] : body

    if (!data.success || !data.titles || !data.blog_post || !data.show_notes) {
      console.error("[v0] Invalid callback data structure")
      return NextResponse.json({ error: "Invalid data structure" }, { status: 400 })
    }

    // This endpoint just validates and confirms receipt
    return NextResponse.json({
      success: true,
      message: "Content generation completed",
      workflow_id: data.workflow_id,
    })
  } catch (error) {
    console.error("[v0] Generate callback error:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
