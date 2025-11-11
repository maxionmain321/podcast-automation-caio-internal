"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Upload, File, X, Copy, CheckCircle } from "lucide-react"
import type { ActivityLogEntry } from "./dashboard-content"

type UploadCardProps = {
  onUploadComplete: (file: { url: string; filename: string; size: number; webhookData?: any }) => void
  addLogEntry: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void
}

export function UploadCard({ onUploadComplete, addLogEntry }: UploadCardProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [directUrl, setDirectUrl] = useState("")
  const [transcriptResponse, setTranscriptResponse] = useState<string>("")
  const [copied, setCopied] = useState(false)

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
    setTranscriptResponse("")

    try {
      console.log("[v0] Starting upload for:", file.name)

      console.log("[v0] Uploading file via server proxy...")
      setUploadProgress(10)

      const uploadResponse = await fetch("/api/upload", {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "X-Filename": file.name,
        },
      })

      console.log("[v0] Upload response status:", uploadResponse.status)
      setUploadProgress(70)

      if (!uploadResponse.ok) {
        let errorMsg = "Failed to upload file"
        try {
          const errorData = await uploadResponse.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          errorMsg = uploadResponse.statusText || errorMsg
        }
        throw new Error(errorMsg)
      }

      const { fileUrl } = await uploadResponse.json()
      console.log("[v0] Upload successful! File URL:", fileUrl)
      setUploadProgress(80)

      addLogEntry({
        type: "upload",
        message: `File uploaded: ${file.name}`,
      })

      console.log("[v0] Triggering transcription webhook...")
      setUploading(false)
      setProcessing(true)
      setUploadProgress(85)

      const webhookResponse = await fetch("/api/webhook/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: fileUrl,
          episode_title: file.name,
          metadata: {
            filename: file.name,
            size: file.size,
          },
        }),
      })

      setUploadProgress(95)

      if (!webhookResponse.ok) {
        throw new Error("Failed to start transcription")
      }

      const webhookData = await webhookResponse.json()
      console.log("[v0] Webhook triggered successfully:", webhookData)

      let transcript = ""
      if (webhookData.transcript) {
        transcript = webhookData.transcript
      } else if (Array.isArray(webhookData) && webhookData.length > 0) {
        transcript = webhookData[0].transcript_text || webhookData[0].transcript || ""
      }

      if (transcript) {
        setTranscriptResponse(transcript)
        console.log("[v0] Transcript extracted, length:", transcript.length)
      }

      setUploadProgress(100)

      addLogEntry({
        type: "transcribe",
        message: "Transcription completed",
      })

      onUploadComplete({
        url: fileUrl,
        filename: file.name,
        size: file.size,
        webhookData,
      })

      setProcessing(false)
    } catch (err) {
      console.error("[v0] Upload failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Upload failed"
      setError(errorMessage)
      addLogEntry({ type: "error", message: errorMessage })
      setProcessing(false)
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

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcriptResponse)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("[v0] Failed to copy:", err)
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

        {processing && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              Processing file and starting transcription...
            </AlertDescription>
          </Alert>
        )}

        {transcriptResponse && (
          <Alert>
            <AlertDescription className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Transcript Generated Successfully
                </p>
                <Button size="sm" variant="outline" onClick={handleCopyTranscript}>
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Textarea value={transcriptResponse} readOnly className="min-h-[200px] font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                {transcriptResponse.length} characters • {transcriptResponse.split(/\s+/).length} words
              </p>
            </AlertDescription>
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
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={uploading || processing}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {(uploading || processing) && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-muted-foreground">
                    {processing ? "Processing..." : `Uploading... ${uploadProgress}%`}
                  </p>
                </div>
              )}

              <Button onClick={handleUpload} disabled={uploading || processing} className="w-full">
                {uploading ? "Uploading..." : processing ? "Processing..." : "Upload to R2"}
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
              disabled={uploading || processing}
            />
            <Button
              onClick={handleDirectUrlSubmit}
              disabled={!directUrl || uploading || processing}
              variant="secondary"
            >
              Add URL
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
