import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")

  if (!session) {
    redirect("/login")
  }

  return <DashboardContent />
}
