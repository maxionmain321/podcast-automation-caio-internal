import { LoginForm } from "@/components/login-form"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Podcast Automation</h1>
          <p className="text-muted-foreground mt-2">Internal team access only</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
