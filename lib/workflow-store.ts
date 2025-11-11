"use client"

export type { WorkflowData }

type WorkflowData = {
  id: string
  uploadedFile: {
    url: string
    filename: string
    size: number
  } | null
  transcript: string
  episodeTitle?: string
  transcriptionId?: string
  transcriptApproved: boolean
  generatedContent: {
    seoTitle: string
    blogPostHtml: string
    showNotesHtml: string
  } | null
  selectedContent?: {
    seoTitle?: string
    blogPostMarkdown?: string
    showNotesHtml?: string
  }
  activityLog: Array<{
    id: string
    timestamp: Date
    type: "upload" | "transcribe" | "generate" | "publish" | "error"
    message: string
    details?: any
  }>
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = "podcast_workflows"

export function getWorkflows(): WorkflowData[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  return JSON.parse(data, (key, value) => {
    if (key === "timestamp" || key === "createdAt" || key === "updatedAt") {
      return new Date(value)
    }
    return value
  })
}

export function getWorkflow(id: string): WorkflowData | null {
  const workflows = getWorkflows()
  return workflows.find((w) => w.id === id) || null
}

export function saveWorkflow(workflow: WorkflowData): void {
  const workflows = getWorkflows()
  const index = workflows.findIndex((w) => w.id === workflow.id)

  workflow.updatedAt = new Date()

  if (index >= 0) {
    workflows[index] = workflow
  } else {
    workflows.push(workflow)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows))
}

export function createWorkflow(): WorkflowData {
  const workflow: WorkflowData = {
    id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    uploadedFile: null,
    transcript: "",
    episodeTitle: undefined,
    transcriptionId: undefined,
    transcriptApproved: false,
    generatedContent: null,
    selectedContent: undefined,
    activityLog: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  saveWorkflow(workflow)
  return workflow
}

export function deleteWorkflow(id: string): void {
  const workflows = getWorkflows()
  const filtered = workflows.filter((w) => w.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
