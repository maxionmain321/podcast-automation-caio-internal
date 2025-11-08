import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"

// In-memory storage for demo purposes
// In production, use a database like Redis or PostgreSQL
const transcriptionJobs = new Map<
  string,
  {
    status: "processing" | "completed" | "failed"
    transcript?: string
    error?: string
  }
>()

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const jobId = request.nextUrl.searchParams.get("jobId")

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 })
    }

    // Check job status
    const job = transcriptionJobs.get(jobId)

    if (!job) {
      // Job not found - could still be processing
      return NextResponse.json({
        status: "processing",
        message: "Job is being processed",
      })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}

// Helper function to update job status (called by callback endpoint)
export function updateTranscriptionJob(
  jobId: string,
  status: "processing" | "completed" | "failed",
  data?: { transcript?: string; error?: string },
) {
  transcriptionJobs.set(jobId, {
    status,
    ...data,
  })
}
