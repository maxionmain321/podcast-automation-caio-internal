import { type NextRequest, NextResponse } from "next/server"
import { getContentGeneration } from "@/lib/content-generation-store"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const workflowId = searchParams.get("workflowId")

  if (!workflowId) {
    return NextResponse.json({ error: "Missing workflowId" }, { status: 400 })
  }

  console.log("[v0] Polling for content generation:", workflowId)

  const content = getContentGeneration(workflowId)

  if (content) {
    console.log("[v0] Content found for workflow:", workflowId)
    return NextResponse.json({
      status: "completed",
      data: {
        titles: content.titles,
        blog_post: content.blog_post,
        show_notes: content.show_notes,
        seo: content.seo,
      },
    })
  }

  return NextResponse.json({ status: "processing" })
}
