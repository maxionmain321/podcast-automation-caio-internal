"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, File, X } from "lucide-react"
import type { ActivityLogEntry } from "./dashboard-content"

type UploadCardProps = {
  onUploadComplete: (file: { url: string; filename: string; size: number }) => void
  addLogEntry: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void
}

export function UploadCard({ onUploadComplete, addLogEntry }: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [directUrl, setDirectUrl] = useState("")

  const validateFile = (file: File) => {
    const validTypes = ["video/mp4", "video/quicktime", "audio/mpeg", "audio/mp3"]
    const maxSize = 1.5 * 1024 * 1024 * 1024 // 1.5GB

    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|mp3)$/i)) {
      return "Invalid file type. Please upload .mp4, .mov, or .mp3 files."
    }

    if (file.size > maxSize) {
      return "File size exceeds 1.5GB limit."
    }

    return null
  }

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      addLogEntry({ type: "error", message: validationError })
      return
    }

    setFile(selectedFile)
    setError("")
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    setError("")

    try {
      console.log("[v0] Starting upload for:", file.name)

      console.log("[v0] Requesting presigned URL...")
      setUploadProgress(5)

      const urlResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      })

      console.log("[v0] Presigned URL response status:", urlResponse.status)

      if (!urlResponse.ok) {
        let errorMsg = "Failed to get upload URL"
        try {
          const errorData = await urlResponse.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          // If response is not JSON, use status text
          errorMsg = urlResponse.statusText || errorMsg
        }
        throw new Error(errorMsg)
      }

      const { uploadUrl, fileUrl } = await urlResponse.json()
      console.log("[v0] Got presigned URL, uploading file...")
      setUploadProgress(10)

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      })

      console.log("[v0] R2 upload response status:", uploadResponse.status)
      setUploadProgress(90)

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to R2")
      }

      console.log("[v0] Upload successful! File URL:", fileUrl)
      setUploadProgress(100)

      addLogEntry({
        type: "upload",
        message: `File uploaded: ${file.name}`,
      })

      onUploadComplete({
        url: fileUrl,
        filename: file.name,
        size: file.size,
      })

      // Reset form
      setFile(null)
      setUploadProgress(0)
    } catch (err) {
      console.error("[v0] Upload failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Upload failed"
      setError(errorMessage)
      addLogEntry({ type: "error", message: errorMessage })
    } finally {
      setUploading(false)
    }
  }

  const handleDirectUrlSubmit = () => {
    if (!directUrl) return

    try {
      const url = new URL(directUrl)
      const filename = url.pathname.split("/").pop() || "direct-upload"

      onUploadComplete({
        url: directUrl,
        filename,
        size: 0,
      })

      setDirectUrl("")
      addLogEntry({
        type: "upload",
        message: `Direct URL added: ${filename}`,
      })
    } catch (err) {
      setError("Invalid URL format")
      addLogEntry({ type: "error", message: "Invalid URL format" })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Podcast File</CardTitle>
        <CardDescription>Upload your podcast audio or video file (.mp4, .mov, .mp3)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-brand bg-brand/5" : "border-border"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <File className="h-8 w-8 text-brand" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={uploading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                </div>
              )}

              <Button onClick={handleUpload} disabled={uploading} className="w-full">
                {uploading ? "Uploading..." : "Upload to R2"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Drag and drop your file here, or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Max file size: 1.5GB</p>
              </div>
              <Input
                type="file"
                accept=".mp4,.mov,.mp3,video/mp4,video/quicktime,audio/mpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0])
                  }
                }}
                className="max-w-xs mx-auto"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="direct-url">Or paste a direct file URL</Label>
          <div className="flex gap-2">
            <Input
              id="direct-url"
              type="url"
              placeholder="https://example.com/podcast.mp3"
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
              disabled={uploading}
            />
            <Button onClick={handleDirectUrlSubmit} disabled={!directUrl || uploading} variant="secondary">
              Add URL
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
