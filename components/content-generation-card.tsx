"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, FileText } from "lucide-react"
import type { ActivityLogEntry } from "./dashboard-content"

type ContentGenerationCardProps = {
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
  }) => void
  addLogEntry: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void
}

export function ContentGenerationCard({
  transcript,
  transcriptApproved,
  generatedContent,
  onContentGenerated,
  onContentEdit,
  addLogEntry,
}: ContentGenerationCardProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [episodeTitle, setEpisodeTitle] = useState("")

  const handleGenerate = async () => {
    if (!transcript) return

    setGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/webhook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript_text: transcript,
          episode_title: episodeTitle || "Untitled Episode",
          metadata: {
            transcript_length: transcript.length,
            word_count: transcript.split(/\s+/).length,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate content")
      }

      const data = await response.json()

      if (!data.seo_title || !data.blog_post_html || !data.show_notes_html) {
        throw new Error("Invalid response from content generation service")
      }

      onContentGenerated({
        seoTitle: data.seo_title,
        blogPostHtml: data.blog_post_html,
        showNotesHtml: data.show_notes_html,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Content generation failed"
      setError(errorMessage)
      addLogEntry({ type: "error", message: errorMessage })
    } finally {
      setGenerating(false)
    }
  }

  const handleEdit = (field: "seoTitle" | "blogPostHtml" | "showNotesHtml", value: string) => {
    if (!generatedContent) return

    onContentEdit({
      ...generatedContent,
      [field]: value,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Content Generation</CardTitle>
            <CardDescription>Generate blog post and show notes with AI</CardDescription>
          </div>
          {generatedContent && (
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" />
              Generated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!transcriptApproved && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>Please approve the transcript first before generating content.</AlertDescription>
          </Alert>
        )}

        {transcriptApproved && !generatedContent && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="episode-title">Episode Title (Optional)</Label>
              <Input
                id="episode-title"
                placeholder="Enter episode title for better context..."
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                disabled={generating}
              />
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        )}

        {generatedContent && (
          <Tabs defaultValue="title" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="title">Title</TabsTrigger>
              <TabsTrigger value="blog">Blog Post</TabsTrigger>
              <TabsTrigger value="notes">Show Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="title" className="space-y-2">
              <Label htmlFor="seo-title">SEO Title</Label>
              <Input
                id="seo-title"
                value={generatedContent.seoTitle}
                onChange={(e) => handleEdit("seoTitle", e.target.value)}
                placeholder="SEO-optimized title..."
              />
              <p className="text-xs text-muted-foreground">{generatedContent.seoTitle.length} characters</p>
            </TabsContent>

            <TabsContent value="blog" className="space-y-2">
              <Label htmlFor="blog-post">Blog Post HTML</Label>
              <Textarea
                id="blog-post"
                value={generatedContent.blogPostHtml}
                onChange={(e) => handleEdit("blogPostHtml", e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Blog post content..."
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{generatedContent.blogPostHtml.length} characters</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const preview = window.open("", "_blank")
                    if (preview) {
                      preview.document.write(generatedContent.blogPostHtml)
                      preview.document.close()
                    }
                  }}
                >
                  Preview HTML
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-2">
              <Label htmlFor="show-notes">Show Notes HTML</Label>
              <Textarea
                id="show-notes"
                value={generatedContent.showNotesHtml}
                onChange={(e) => handleEdit("showNotesHtml", e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Show notes content..."
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{generatedContent.showNotesHtml.length} characters</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const preview = window.open("", "_blank")
                    if (preview) {
                      preview.document.write(generatedContent.showNotesHtml)
                      preview.document.close()
                    }
                  }}
                >
                  Preview HTML
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {generatedContent && (
          <Button variant="outline" onClick={handleGenerate} disabled={generating} className="w-full bg-transparent">
            {generating ? "Regenerating..." : "Regenerate Content"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
