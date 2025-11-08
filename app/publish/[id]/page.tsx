import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { PublishPage } from "@/components/publish-page"

export default async function PublishPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")

  if (!session) {
    redirect("/login")
  }

  const { id } = await params

  return <PublishPage workflowId={id} />
}
