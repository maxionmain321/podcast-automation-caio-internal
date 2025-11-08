"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function TranscriptionCard({
  uploadedFile,
  transcript,
  transcriptApproved,
  onTranscriptReceived,
  onTranscriptApproved,
  onTranscriptEdit,
  addLogEntry,
}: any) {
  const [isLoading, setIsLoading] = useState(false)

  const handleTranscribe = async () => {
    if (!uploadedFile) return
    setIsLoading(true)

    addLogEntry({ type: "transcribe", message: `Transcribing ${uploadedFile.filename}...` })

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: uploadedFile.url }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Transcription failed")

      onTranscriptReceived(data.transcript)
    } catch (err: any) {
      addLogEntry({ type: "error", message: `Transcription error: ${err.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcription</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleTranscribe}
          disabled={!uploadedFile || isLoading}
          className="w-full mb-4"
        >
          {isLoading ? "Transcribing..." : "Generate Transcript"}
        </Button>
        {transcript && (
          <>
            <Textarea
              value={transcript}
              onChange={(e) => onTranscriptEdit(e.target.value)}
              className="w-full min-h-[200px] mb-2"
            />
            <Button onClick={onTranscriptApproved} disabled={transcriptApproved} className="w-full">
              {transcriptApproved ? "Approved ✅" : "Approve Transcript"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

