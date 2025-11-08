"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DashboardHeader } from "@/components/dashboard-header"
import { getWorkflow } from "@/lib/workflow-store"
import { Loader2, CheckCircle, ExternalLink, ArrowLeft, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function PublishPage({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [workflow, setWorkflow] = useState(getWorkflow(workflowId))
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState("")
  const [postUrl, setPostUrl] = useState("")
  const [category, setCategory] = useState("Podcast")
  const [tags, setTags] = useState("podcast, episode")
  const [publishImmediately, setPublishImmediately] = useState(true)

  // Editable content
  const [seoTitle, setSeoTitle] = useState("")
  const [blogPostHtml, setBlogPostHtml] = useState("")
  const [showNotesHtml, setShowNotesHtml] = useState("")

  useEffect(() => {
    if (!workflow || !workflow.generatedContent) {
      router.push("/dashboard")
    } else {
      setSeoTitle(workflow.generatedContent.seoTitle)
      setBlogPostHtml(workflow.generatedContent.blogPostHtml)
      setShowNotesHtml(workflow.generatedContent.showNotesHtml)
    }
  }, [workflow, router])

  if (!workflow || !workflow.generatedContent) {
    return null
  }

  const handlePublish = async () => {
    setPublishing(true)
    setError("")

    try {
      const response = await fetch("/api/webhook/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seo_title: seoTitle,
          blog_post_html: blogPostHtml,
          show_notes_html: showNotesHtml,
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
      toast({
        title: "Success",
        description: "Successfully published to WordPress!",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Publishing failed"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/transcript/${workflow.id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transcript
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Step 3: Publish to WordPress</h2>
              <p className="text-sm text-muted-foreground">Review and publish your content to WordPress</p>
            </div>
            {published && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Published
              </Badge>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!published ? (
            <>
              {/* Content Preview & Edit */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Preview</CardTitle>
                  <CardDescription>Review and edit your content before publishing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">SEO Title</Label>
                    <Input
                      id="title"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="SEO-optimized title..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blog-post">Blog Post HTML</Label>
                    <Textarea
                      id="blog-post"
                      value={blogPostHtml}
                      onChange={(e) => setBlogPostHtml(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Blog post content..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="show-notes">Show Notes HTML</Label>
                    <Textarea
                      id="show-notes"
                      value={showNotesHtml}
                      onChange={(e) => setShowNotesHtml(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Show notes content..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Publishing Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Publishing Settings</CardTitle>
                  <CardDescription>Configure WordPress publishing options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        Publish to WordPress
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Successfully published to WordPress!</AlertDescription>
                </Alert>

                {postUrl && (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => window.open(postUrl, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Published Post
                  </Button>
                )}

                <Button variant="default" className="w-full" onClick={() => router.push("/dashboard")}>
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
