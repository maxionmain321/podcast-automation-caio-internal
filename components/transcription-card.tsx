"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, FileText } from "lucide-react"
import type { ActivityLogEntry } from "./dashboard-content"

type TranscriptionCardProps = {
  uploadedFile: { url: string; filename: string; size: number } | null
  transcript: string
  transcriptApproved: boolean
  onTranscriptReceived: (transcript: string) => void
  onTranscriptApproved: () => void
  onTranscriptEdit: (transcript: string) => void
  addLogEntry: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void
}

type TranscriptionStatus = "idle" | "processing" | "polling" | "completed" | "error"

export function TranscriptionCard({
  uploadedFile,
  transcript,
  transcriptApproved,
  onTranscriptReceived,
  onTranscriptApproved,
  onTranscriptEdit,
  addLogEntry,
}: TranscriptionCardProps) {
  const [status, setStatus] = useState<TranscriptionStatus>("idle")
  const [error, setError] = useState("")
  const [jobId, setJobId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const startTranscription = async () => {
    if (!uploadedFile) return

    setStatus("processing")
    setError("")

    try {
      const response = await fetch("/api/webhook/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: uploadedFile.url,
          episode_title: uploadedFile.filename,
          metadata: {
            filename: uploadedFile.filename,
            size: uploadedFile.size,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start transcription")
      }

      const data = await response.json()

      // Check if we got immediate transcript or need to poll
      if (data.transcript) {
        onTranscriptReceived(data.transcript)
        setStatus("completed")
      } else if (data.jobId) {
        setJobId(data.jobId)
        setStatus("polling")
        startPolling(data.jobId)
      } else {
        throw new Error("Invalid response from transcription service")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transcription failed"
      setError(errorMessage)
      setStatus("error")
      addLogEntry({ type: "error", message: errorMessage })
    }
  }

  const startPolling = async (jobId: string) => {
    const maxAttempts = 60 // 5 minutes with 5-second intervals
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/transcription-status?jobId=${jobId}`)

        if (!response.ok) {
          throw new Error("Failed to check transcription status")
        }

        const data = await response.json()

        if (data.status === "completed" && data.transcript) {
          onTranscriptReceived(data.transcript)
          setStatus("completed")
          return
        }

        if (data.status === "failed") {
          throw new Error(data.error || "Transcription failed")
        }

        // Continue polling if still processing
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          throw new Error("Transcription timeout - please try again")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Polling failed"
        setError(errorMessage)
        setStatus("error")
        addLogEntry({ type: "error", message: errorMessage })
      }
    }

    poll()
  }

  const handleApprove = () => {
    onTranscriptApproved()
    setIsEditing(false)
  }

  const getStatusBadge = () => {
    switch (status) {
      case "processing":
      case "polling":
        return <Badge variant="secondary">Processing...</Badge>
      case "completed":
        return transcriptApproved ? (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        ) : (
          <Badge variant="secondary">Ready for Review</Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Not Started</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transcription</CardTitle>
            <CardDescription>Generate transcript using Whisper AI</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!uploadedFile && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>Please upload a file first to generate a transcript.</AlertDescription>
          </Alert>
        )}

        {uploadedFile && !transcript && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Ready to transcribe:</p>
              <p className="text-sm text-muted-foreground">{uploadedFile.filename}</p>
            </div>

            <Button
              onClick={startTranscription}
              disabled={status === "processing" || status === "polling"}
              className="w-full"
            >
              {status === "processing" || status === "polling" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {status === "processing" ? "Starting..." : "Transcribing..."}
                </>
              ) : (
                "Generate Transcript"
              )}
            </Button>

            {jobId && status === "polling" && (
              <p className="text-xs text-muted-foreground text-center">
                Job ID: {jobId} - This may take a few minutes...
              </p>
            )}
          </div>
        )}

        {transcript && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Transcript</label>
                {!transcriptApproved && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? "Preview" : "Edit"}
                  </Button>
                )}
              </div>

              {isEditing ? (
                <Textarea
                  value={transcript}
                  onChange={(e) => onTranscriptEdit(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Transcript will appear here..."
                />
              ) : (
                <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{transcript}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {transcript.length} characters, ~{Math.ceil(transcript.split(/\s+/).length)} words
              </p>
            </div>

            {!transcriptApproved && (
              <div className="flex gap-2">
                <Button onClick={handleApprove} className="flex-1">
                  Approve Transcript
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onTranscriptEdit("")
                    setStatus("idle")
                    setJobId(null)
                  }}
                >
                  Re-upload File
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
