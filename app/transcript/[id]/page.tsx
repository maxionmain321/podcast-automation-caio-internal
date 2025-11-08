import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { TranscriptReviewPage } from "@/components/transcript-review-page"

export default async function TranscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")

  if (!session) {
    redirect("/login")
  }

  const { id } = await params

  return <TranscriptReviewPage workflowId={id} />
}
