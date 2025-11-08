"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function DashboardHeader() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Podcast Automation</h1>
          <p className="text-sm text-muted-foreground">Internal workflow dashboard</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </header>
  )
}
