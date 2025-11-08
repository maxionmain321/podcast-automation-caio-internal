"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PublishCard({ generatedContent, addLogEntry }: any) {
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async () => {
    if (!generatedContent) return
    setIsPublishing(true)
    addLogEntry({ type: "publish", message: "Publishing content..." })

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatedContent),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Publish failed")

      addLogEntry({ type: "publish", message: "Published successfully!" })
    } catch (err: any) {
      addLogEntry({ type: "error", message: `Publish failed: ${err.message}` })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handlePublish} disabled={!generatedContent || isPublishing} className="w-full">
          {isPublishing ? "Publishing..." : "Publish Content"}
        </Button>
      </CardContent>
    </Card>
  )
}

