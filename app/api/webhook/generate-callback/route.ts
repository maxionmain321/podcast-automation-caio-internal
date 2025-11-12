import { type NextRequest, NextResponse } from "next/server"
import { saveContentGeneration } from "@/lib/content-generation-store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Generate callback received:", {
      hasSuccess: !!body.success,
      hasTitles: !!body.titles,
      hasBlogPost: !!body.blog_post,
      hasShowNotes: !!body.show_notes,
      workflowId: body.workflow_id,
    })

    const data = Array.isArray(body) ? body[0] : body

    if (!data.success) {
      console.error("[v0] Callback reported failure:", data)
      return NextResponse.json({ error: "Content generation failed" }, { status: 400 })
    }

    if (!data.workflow_id) {
      console.error("[v0] Missing workflow_id in callback")
      return NextResponse.json({ error: "Missing workflow_id" }, { status: 400 })
    }

    saveContentGeneration(data.workflow_id, {
      workflow_id: data.workflow_id,
      success: data.success,
      titles: data.titles,
      blog_post: data.blog_post,
      show_notes: data.show_notes,
      seo: data.seo,
    })

    return NextResponse.json({ success: true, message: "Content generation complete" })
  } catch (error) {
    console.error("Generate callback error:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
