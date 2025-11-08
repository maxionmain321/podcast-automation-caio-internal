"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@components/ui/textarea"
import { Loader2 } from "lucide-react"

interface Props {
  transcript: string
  transcriptApproved: boolean
  generatedContent: {
    seoTitle: string
    blogPostHtml: string
    showNotesHtml: string
  } | null
  onContentGenerated: (content: {
    seoTitle: string
    blogPostHtml: string
    showNotesHtml: string
  }) => void
  onContentEdit: (content: {
    seoTitle: string
    blogPostHtml: string
    showNotesHtml: string
  } | null) => void
  addLogEntry: (entry: { type: string; message: string; details?: any }) => void
}

export function ContentGenerationCard({
  transcript,
  transcriptApproved,
  generatedContent,
  onContentGenerated,
  onContentEdit,
  addLogEntry,
}: Props) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!transcriptApproved || !transcript) {
      addLogEntry({
        type: "error",
        message: "Transcript must be approved before content generation",
      })
      return
    }

    setLoading(true)
    addLogEntry({ type: "generate", message: "Generating content..." })

    try {
      // This would normally call an API route to generate content using AI
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })

      if (!res.ok) throw new Error("Failed to generate content")

      const data = await res.json()
      onContentGenerated(data)
      addLogEntry({ type: "generate", message: "Content generated successfully" })
    } catch (err) {
      console.error("Generation error:", err)
      addLogEntry({ type: "error", message: "Content generation failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Generation</CardTitle>
      </CardHeader>
      <CardContent>
        {!generatedContent ? (
          <p className="text-sm text-muted-foreground mb-4">
            Generate SEO titles, blog posts, and show notes from the transcript.
          </p>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={generatedContent.blogPostHtml}
              onChange={(e) =>
                onContentEdit({
                  ...generatedContent,
                  blogPostHtml: e.target.value,
                })
              }
              className="min-h-[150px]"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleGenerate} disabled={loading || !transcriptApproved}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Generate Content
        </Button>
      </CardFooter>
    </Card>
  )
}

