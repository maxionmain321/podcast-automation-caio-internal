"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UploadCard } from "@/components/upload-card"
import { TranscriptionCard } from "@/components/transcription-card"
import { ContentGenerationCard } from "@/components/content-generation-card"
import { PublishCard } from "@/components/publish-card"
import { ActivityLog } from "@/components/activity-log"
import { useRouter } from "next/navigation"

export type ActivityLogEntry = {
  id: string
  timestamp: Date
  type: "upload" | "transcribe" | "generate" | "publish" | "error"
  message: string
  details?: any
}

export function DashboardContent() {
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState<{
    url: string
    filename: string
    size: number
  } | null>(null)

  const [transcript, setTranscript] = useState<string>("")
  const [transcriptApproved, setTranscriptApproved] = useState(false)

  const [generatedContent, setGeneratedContent] = useState<{
    seoTitle: string
    blogPostHtml: string
    showNotesHtml: string
  } | null>(null)

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])

  const addLogEntry = (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => {
    setActivityLog((prev) => [
      {
        ...entry,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      },
      ...prev,
    ])
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-muted/30">
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

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <UploadCard
              onUploadComplete={(file) => {
                setUploadedFile(file)
                setTranscript("")
                setTranscriptApproved(false)
                setGeneratedContent(null)
                addLogEntry({
                  type: "upload",
                  message: `File uploaded: ${file.filename}`,
                  details: file,
                })
              }}
              addLogEntry={addLogEntry}
            />

            <TranscriptionCard
              uploadedFile={uploadedFile}
              transcript={transcript}
              transcriptApproved={transcriptApproved}
              onTranscriptReceived={(text) => {
                setTranscript(text)
                addLogEntry({
                  type: "transcribe",
                  message: "Transcript received",
                  details: { length: text.length },
                })
              }}
              onTranscriptApproved={() => {
                setTranscriptApproved(true)
                addLogEntry({
                  type: "transcribe",
                  message: "Transcript approved",
                })
              }}
              onTranscriptEdit={setTranscript}
              addLogEntry={addLogEntry}
            />
          </div>

          <div className="space-y-6">
            <ContentGenerationCard
              transcript={transcript}
              transcriptApproved={transcriptApproved}
              generatedContent={generatedContent}
              onContentGenerated={(content) => {
                setGeneratedContent(content)
                addLogEntry({
                  type: "generate",
                  message: "Content generated",
                  details: content,
                })
              }}
              onContentEdit={setGeneratedContent}
              addLogEntry={addLogEntry}
            />

            <PublishCard generatedContent={generatedContent} addLogEntry={addLogEntry} />

            <ActivityLog entries={activityLog} />
          </div>
        </div>
      </main>
    </div>
  )
}
