// In-memory store for content generation results
// This allows the server callback to save data that the client can poll for

interface ContentGenerationResult {
  workflow_id: string
  success: boolean
  titles?: any
  blog_post?: any
  show_notes?: any
  seo?: any
  timestamp: number
}

const contentStore = new Map<string, ContentGenerationResult>()

// Clean up old results after 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000
const MAX_AGE = 10 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of contentStore.entries()) {
    if (now - value.timestamp > MAX_AGE) {
      contentStore.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

export function saveContentGeneration(workflowId: string, data: Omit<ContentGenerationResult, "timestamp">) {
  console.log("[v0] Saving content generation for workflow:", workflowId)
  contentStore.set(workflowId, {
    ...data,
    timestamp: Date.now(),
  })
}

export function getContentGeneration(workflowId: string): ContentGenerationResult | null {
  const result = contentStore.get(workflowId)
  if (result) {
    console.log("[v0] Retrieved content generation for workflow:", workflowId)
    // Clear after retrieval to prevent stale data
    contentStore.delete(workflowId)
  }
  return result || null
}
