"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, CheckCircle, ExternalLink, Send } from "lucide-react"
import type { ActivityLogEntry } from "./dashboard-content"

type PublishCardProps = {
  generatedContent: {
    seoTitle: string
    blogPostHtml: string
    showNotesHtml: string
  } | null
  addLogEntry: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void
}

export function PublishCard({ generatedContent, addLogEntry }: PublishCardProps) {
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState("")
  const [postUrl, setPostUrl] = useState("")
  const [category, setCategory] = useState("Podcast")
  const [tags, setTags] = useState("podcast, episode")
  const [publishImmediately, setPublishImmediately] = useState(true)

  const handlePublish = async () => {
    if (!generatedContent) return

    setPublishing(true)
    setError("")

    try {
      const response = await fetch("/api/webhook/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seo_title: generatedContent.seoTitle,
          blog_post_html: generatedContent.blogPostHtml,
          show_notes_html: generatedContent.showNotesHtml,
          wordpress_category: category,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          publish_immediately: publishImmediately,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to publish")
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Publishing failed")
      }

      setPublished(true)
      setPostUrl(data.postUrl || "")
      addLogEntry({
        type: "publish",
        message: `Published to WordPress: ${generatedContent.seoTitle}`,
        details: { postUrl: data.postUrl },
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Publishing failed"
      setError(errorMessage)
      addLogEntry({ type: "error", message: errorMessage })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Publish to WordPress</CardTitle>
            <CardDescription>Publish your content to WordPress</CardDescription>
          </div>
          {published && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Published
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

        {!generatedContent && (
          <Alert>
            <Send className="h-4 w-4" />
            <AlertDescription>Generate content first before publishing.</AlertDescription>
          </Alert>
        )}

        {generatedContent && !published && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Ready to publish:</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{generatedContent.seoTitle}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">WordPress Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Podcast"
                disabled={publishing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="podcast, episode, audio"
                disabled={publishing}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="publish-immediately"
                checked={publishImmediately}
                onCheckedChange={(checked) => setPublishImmediately(checked === true)}
                disabled={publishing}
              />
              <Label htmlFor="publish-immediately" className="text-sm font-normal cursor-pointer">
                Publish immediately (uncheck to save as draft)
              </Label>
            </div>

            <Button onClick={handlePublish} disabled={publishing} className="w-full">
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Approve & Publish
                </>
              )}
            </Button>
          </div>
        )}

        {published && postUrl && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Successfully published to WordPress!</AlertDescription>
            </Alert>

            <Button variant="outline" className="w-full bg-transparent" onClick={() => window.open(postUrl, "_blank")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Published Post
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setPublished(false)
                setPostUrl("")
              }}
            >
              Publish Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
