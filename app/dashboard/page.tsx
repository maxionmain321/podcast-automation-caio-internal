import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { DashboardUploadPage } from "@/components/dashboard-upload-page"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")

  if (!session) {
    redirect("/login")
  }

  return <DashboardUploadPage />
}
