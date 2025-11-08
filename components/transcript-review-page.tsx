"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard-header"
import { getWorkflow, saveWorkflow } from "@/lib/workflow-store"
import { Loader2, Sparkles, CheckCircle, ArrowLeft } from "lucide-react"

export function TranscriptReviewPage({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const [workflow, setWorkflow] = useState(getWorkflow(workflowId))
  const [isEditing, setIsEditing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [episodeTitle, setEpisodeTitle] = useState("")

  useEffect(() => {
    if (!workflow) {
      router.push("/dashboard")
    }
  }, [workflow, router])

  if (!workflow) {
    return null
  }

  const handleTranscriptEdit = (text: string) => {
    const updatedWorkflow = {
      ...workflow,
      transcript: text,
    }
    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)
  }

  const handleApproveTranscript = () => {
    const updatedWorkflow = {
      ...workflow,
      transcriptApproved: true,
    }
    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)
    setIsEditing(false)
  }

  const handleGenerateContent = async () => {
    setGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/webhook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript_text: workflow.transcript,
          episode_title: episodeTitle || "Untitled Episode",
          metadata: {
            transcript_length: workflow.transcript.length,
            word_count: workflow.transcript.split(/\s+/).length,
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

      const updatedWorkflow = {
        ...workflow,
        generatedContent: {
          seoTitle: data.seo_title,
          blogPostHtml: data.blog_post_html,
          showNotesHtml: data.show_notes_html,
        },
      }

      setWorkflow(updatedWorkflow)
      saveWorkflow(updatedWorkflow)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Content generation failed"
      setError(errorMessage)
    } finally {
      setGenerating(false)
    }
  }

  const handleContentEdit = (field: "seoTitle" | "blogPostHtml" | "showNotesHtml", value: string) => {
    if (!workflow.generatedContent) return

    const updatedWorkflow = {
      ...workflow,
      generatedContent: {
        ...workflow.generatedContent,
        [field]: value,
      },
    }

    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Step 2: Transcript Review & Content Generation</h2>
            <p className="text-sm text-muted-foreground">Review your transcript and generate blog content</p>
          </div>

          {/* Transcript Review Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transcript</CardTitle>
                  <CardDescription>Review and edit your transcript</CardDescription>
                </div>
                {workflow.transcriptApproved && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Transcript</label>
                  {!workflow.transcriptApproved && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                      {isEditing ? "Preview" : "Edit"}
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <Textarea
                    value={workflow.transcript}
                    onChange={(e) => handleTranscriptEdit(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    placeholder="Transcript will appear here..."
                  />
                ) : (
                  <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap">{workflow.transcript}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {workflow.transcript.length} characters, ~{Math.ceil(workflow.transcript.split(/\s+/).length)} words
                </p>
              </div>

              {!workflow.transcriptApproved && (
                <Button onClick={handleApproveTranscript} className="w-full">
                  Approve Transcript
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Content Generation Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content Generation</CardTitle>
                  <CardDescription>Generate blog post and show notes with AI</CardDescription>
                </div>
                {workflow.generatedContent && (
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

              {!workflow.transcriptApproved && (
                <Alert>
                  <AlertDescription>Please approve the transcript first before generating content.</AlertDescription>
                </Alert>
              )}

              {workflow.transcriptApproved && !workflow.generatedContent && (
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

                  <Button onClick={handleGenerateContent} disabled={generating} className="w-full">
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

              {workflow.generatedContent && (
                <>
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
                        value={workflow.generatedContent.seoTitle}
                        onChange={(e) => handleContentEdit("seoTitle", e.target.value)}
                        placeholder="SEO-optimized title..."
                      />
                      <p className="text-xs text-muted-foreground">
                        {workflow.generatedContent.seoTitle.length} characters
                      </p>
                    </TabsContent>

                    <TabsContent value="blog" className="space-y-2">
                      <Label htmlFor="blog-post">Blog Post HTML</Label>
                      <Textarea
                        id="blog-post"
                        value={workflow.generatedContent.blogPostHtml}
                        onChange={(e) => handleContentEdit("blogPostHtml", e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                        placeholder="Blog post content..."
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{workflow.generatedContent.blogPostHtml.length} characters</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const preview = window.open("", "_blank")
                            if (preview) {
                              preview.document.write(workflow.generatedContent!.blogPostHtml)
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
                        value={workflow.generatedContent.showNotesHtml}
                        onChange={(e) => handleContentEdit("showNotesHtml", e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                        placeholder="Show notes content..."
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{workflow.generatedContent.showNotesHtml.length} characters</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const preview = window.open("", "_blank")
                            if (preview) {
                              preview.document.write(workflow.generatedContent!.showNotesHtml)
                              preview.document.close()
                            }
                          }}
                        >
                          Preview HTML
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button
                    variant="outline"
                    onClick={handleGenerateContent}
                    disabled={generating}
                    className="w-full bg-transparent"
                  >
                    {generating ? "Regenerating..." : "Regenerate Content"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {workflow.generatedContent && (
            <div className="flex justify-end">
              <Button onClick={() => router.push(`/publish/${workflow.id}`)}>Continue to Publish →</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
