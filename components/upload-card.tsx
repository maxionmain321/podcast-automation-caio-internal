"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function UploadCard({ onUploadComplete, addLogEntry }: any) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    addLogEntry({ type: "upload", message: `Uploading ${file.name}...` })

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to get upload URL")

      const uploadRes = await fetch(data.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) throw new Error("Upload failed")

      const fileInfo = {
        url: data.url.split("?")[0],
        filename: file.name,
        size: file.size,
      }

      addLogEntry({ type: "upload", message: `Uploaded: ${file.name}` })
      onUploadComplete(fileInfo)
    } catch (err: any) {
      console.error(err)
      addLogEntry({ type: "error", message: `Upload failed: ${err.message}` })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Podcast File</CardTitle>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <Button disabled={isUploading} className="mt-2 w-full">
          {isUploading ? "Uploading..." : "Select File"}
        </Button>
      </CardContent>
    </Card>
  )
}

