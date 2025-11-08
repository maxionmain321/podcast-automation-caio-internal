"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UploadCard } from "@/components/upload-card"
import { TranscriptionCard } from "@/components/transcription-card"
import { ActivityLog } from "@/components/activity-log"
import { DashboardHeader } from "@/components/dashboard-header"
import { createWorkflow, saveWorkflow, type WorkflowData } from "@/lib/workflow-store"
import type { ActivityLogEntry } from "@/components/dashboard-content"

export function DashboardUploadPage() {
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)

  useEffect(() => {
    // Create a new workflow on mount
    const newWorkflow = createWorkflow()
    setWorkflow(newWorkflow)
  }, [])

  const addLogEntry = (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => {
    if (!workflow) return

    const newEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }

    const updatedWorkflow = {
      ...workflow,
      activityLog: [newEntry, ...workflow.activityLog],
    }

    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)
  }

  const handleUploadComplete = (file: { url: string; filename: string; size: number }) => {
    if (!workflow) return

    const updatedWorkflow = {
      ...workflow,
      uploadedFile: file,
      transcript: "",
      transcriptApproved: false,
      generatedContent: null,
    }

    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)

    addLogEntry({
      type: "upload",
      message: `File uploaded: ${file.filename}`,
      details: file,
    })
  }

  const handleTranscriptReceived = (text: string) => {
    if (!workflow) return

    const updatedWorkflow = {
      ...workflow,
      transcript: text,
    }

    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)

    addLogEntry({
      type: "transcribe",
      message: "Transcript received",
      details: { length: text.length },
    })

    // Auto-redirect to transcript page when transcription completes
    router.push(`/transcript/${workflow.id}`)
  }

  const handleTranscriptEdit = (text: string) => {
    if (!workflow) return

    const updatedWorkflow = {
      ...workflow,
      transcript: text,
    }

    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Step 1: Upload & Transcription</h2>
            <p className="text-sm text-muted-foreground">Upload your podcast file and generate a transcript</p>
          </div>

          <UploadCard onUploadComplete={handleUploadComplete} addLogEntry={addLogEntry} />

          <TranscriptionCard
            uploadedFile={workflow.uploadedFile}
            transcript={workflow.transcript}
            transcriptApproved={workflow.transcriptApproved}
            onTranscriptReceived={handleTranscriptReceived}
            onTranscriptApproved={() => {}}
            onTranscriptEdit={handleTranscriptEdit}
            addLogEntry={addLogEntry}
          />

          {workflow.transcript && (
            <div className="flex justify-end">
              <Button onClick={() => router.push(`/transcript/${workflow.id}`)}>Continue to Transcript Review →</Button>
            </div>
          )}

          <ActivityLog entries={workflow.activityLog} />
        </div>
      </main>
    </div>
  )
}
