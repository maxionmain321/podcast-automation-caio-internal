"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DashboardHeader } from "@/components/dashboard-header"
import { getWorkflow, saveWorkflow } from "@/lib/workflow-store"
import { Loader2, Sparkles, CheckCircle, ArrowLeft, Copy, Check, Eye } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export function TranscriptReviewPage({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const [workflow, setWorkflow] = useState(getWorkflow(workflowId))
  const [isEditing, setIsEditing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [episodeTitle, setEpisodeTitle] = useState("")
  const [isPolling, setIsPolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedTitle, setCopiedTitle] = useState<string | null>(null)
  const [selectedContent, setSelectedContent] = useState<{
    seoTitle?: string
    blogPostMarkdown?: string
    showNotesMarkdown?: string
  }>({})

  useEffect(() => {
    const loadedWorkflow = getWorkflow(workflowId)
    console.log(
      "[v0] Loaded workflow on mount:",
      !!loadedWorkflow,
      "transcript length:",
      loadedWorkflow?.transcript?.length || 0,
    )

    if (loadedWorkflow) {
      setWorkflow(loadedWorkflow)

      if (loadedWorkflow.transcript && loadedWorkflow.transcript.length > 0) {
        console.log("[v0] Transcript found in workflow, no polling needed")
        setIsPolling(false)
      } else {
        console.log("[v0] No transcript in workflow, starting polling")
        setIsPolling(true)
      }
    } else {
      console.log("[v0] No workflow found, redirecting to dashboard")
      router.push("/dashboard")
    }
  }, [workflowId, router])

  useEffect(() => {
    if (workflow?.uploadedFile?.filename && !episodeTitle) {
      setEpisodeTitle(workflow.uploadedFile.filename.replace(/\.[^/.]+$/, ""))
    }
  }, [workflow, episodeTitle])

  useEffect(() => {
    if (!workflow?.transcript && isPolling) {
      const pollInterval = setInterval(() => {
        const updatedWorkflow = getWorkflow(workflowId)
        console.log("[v0] Polling for transcript update...", updatedWorkflow?.transcript?.length || 0)

        if (updatedWorkflow?.transcript) {
          console.log("[v0] Transcript found! Length:", updatedWorkflow.transcript.length)
          setWorkflow(updatedWorkflow)
          setIsPolling(false)
          clearInterval(pollInterval)
        }
      }, 2000)

      setTimeout(() => {
        clearInterval(pollInterval)
        setIsPolling(false)
      }, 120000)

      return () => clearInterval(pollInterval)
    }
  }, [workflow, workflowId, isPolling])

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

      const updatedWorkflow = {
        ...workflow,
        generatedContent: data,
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

  const handleCopyTranscript = async () => {
    if (workflow.transcript) {
      await navigator.clipboard.writeText(workflow.transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyTitle = async (title: string, type: string) => {
    await navigator.clipboard.writeText(title)
    setCopiedTitle(`${type}-${title}`)
    setTimeout(() => setCopiedTitle(null), 2000)
  }

  const handleUseContent = (type: "seoTitle" | "blogPost" | "showNotes", content: string) => {
    const updates: any = {}

    if (type === "seoTitle") {
      updates.seoTitle = content
      setSelectedContent((prev) => ({ ...prev, seoTitle: content }))
    } else if (type === "blogPost") {
      updates.blogPostMarkdown = content
      setSelectedContent((prev) => ({ ...prev, blogPostMarkdown: content }))
    } else if (type === "showNotes") {
      updates.showNotesMarkdown = content
      setSelectedContent((prev) => ({ ...prev, showNotesMarkdown: content }))
    }

    const updatedWorkflow = {
      ...workflow,
      selectedContent: {
        ...workflow.selectedContent,
        ...updates,
      },
    }

    setWorkflow(updatedWorkflow)
    saveWorkflow(updatedWorkflow)

    toast({
      title: "Content selected",
      description: `${type === "seoTitle" ? "Title" : type === "blogPost" ? "Blog post" : "Show notes"} will be used in publish page`,
    })
  }

  const markdownToHtml = (markdown: string) => {
    return markdown
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-2 mt-4">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ul class="list-disc mb-4">$1</ul>')
  }

  const showNotesToHtml = (showNotes: any) => {
    if (!showNotes) return ""

    let html = '<div class="show-notes">\n'

    if (showNotes.episode_summary) {
      html += `  <div class="episode-summary">\n`
      html += `    <h3>Episode Summary</h3>\n`
      html += `    <p>${showNotes.episode_summary}</p>\n`
      html += `  </div>\n\n`
    }

    if (showNotes.key_topics_discussed?.length) {
      html += `  <div class="key-topics">\n`
      html += `    <h3>Key Topics Discussed</h3>\n`
      html += `    <ul>\n`
      showNotes.key_topics_discussed.forEach((topic: string) => {
        html += `      <li>${topic}</li>\n`
      })
      html += `    </ul>\n`
      html += `  </div>\n\n`
    }

    if (showNotes.key_takeaways?.length) {
      html += `  <div class="key-takeaways">\n`
      html += `    <h3>Key Takeaways</h3>\n`
      html += `    <ul>\n`
      showNotes.key_takeaways.forEach((takeaway: string) => {
        html += `      <li>${takeaway}</li>\n`
      })
      html += `    </ul>\n`
      html += `  </div>\n\n`
    }

    if (showNotes.notable_quotes?.length) {
      html += `  <div class="notable-quotes">\n`
      html += `    <h3>Notable Quotes</h3>\n`
      showNotes.notable_quotes.forEach((quote: string) => {
        html += `    <blockquote>"${quote}"</blockquote>\n`
      })
      html += `  </div>\n\n`
    }

    if (showNotes.timestamps?.length) {
      html += `  <div class="timestamps">\n`
      html += `    <h3>Timestamps</h3>\n`
      html += `    <ul>\n`
      showNotes.timestamps.forEach((ts: any) => {
        html += `      <li><strong>${ts.time}</strong> - ${ts.topic}`
        if (ts.description) {
          html += `<br/>${ts.description}`
        }
        html += `</li>\n`
      })
      html += `    </ul>\n`
      html += `  </div>\n`
    }

    html += "</div>"
    return html
  }

  const showNotesToMarkdown = (showNotes: any) => {
    if (!showNotes) return ""

    let markdown = "# Show Notes\n\n"

    if (showNotes.episode_summary) {
      markdown += `## Episode Summary\n\n${showNotes.episode_summary}\n\n`
    }

    if (showNotes.key_topics_discussed?.length) {
      markdown += `## Key Topics Discussed\n\n`
      showNotes.key_topics_discussed.forEach((topic: string) => {
        markdown += `- ${topic}\n`
      })
      markdown += `\n`
    }

    if (showNotes.key_takeaways?.length) {
      markdown += `## Key Takeaways\n\n`
      showNotes.key_takeaways.forEach((takeaway: string) => {
        markdown += `- ${takeaway}\n`
      })
      markdown += `\n`
    }

    if (showNotes.notable_quotes?.length) {
      markdown += `## Notable Quotes\n\n`
      showNotes.notable_quotes.forEach((quote: string) => {
        markdown += `> "${quote}"\n\n`
      })
    }

    if (showNotes.timestamps?.length) {
      markdown += `## Timestamps\n\n`
      showNotes.timestamps.forEach((ts: any) => {
        markdown += `**${ts.time}** - ${ts.topic}`
        if (ts.description) {
          markdown += `\n  ${ts.description}`
        }
        markdown += `\n\n`
      })
    }

    return markdown
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
                <div className="flex items-center gap-2">
                  {workflow.transcript && (
                    <Button variant="outline" size="sm" onClick={handleCopyTranscript}>
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                  {workflow.transcriptApproved && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPolling && !workflow.transcript && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>Waiting for transcript to be generated... This may take a minute.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Transcript</label>
                  {!workflow.transcriptApproved && workflow.transcript && (
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
                    {workflow.transcript ? (
                      <p className="text-sm whitespace-pre-wrap">{workflow.transcript}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {isPolling
                          ? "Processing transcript..."
                          : "Transcript will appear here once processing is complete..."}
                      </p>
                    )}
                  </div>
                )}

                {workflow.transcript && (
                  <p className="text-xs text-muted-foreground">
                    {workflow.transcript.length} characters, ~{Math.ceil(workflow.transcript.split(/\s+/).length)} words
                  </p>
                )}
              </div>

              {!workflow.transcriptApproved && workflow.transcript && (
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
                <div className="space-y-6">
                  {/* Blog Titles */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Blog Titles</Label>
                    <div className="space-y-2">
                      {workflow.generatedContent.titles?.blog_titles?.map((title: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                          <span className="flex-1 text-sm">{title}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleCopyTitle(title, "blog")}>
                            {copiedTitle === `blog-${title}` ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant={selectedContent.seoTitle === title ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleUseContent("seoTitle", title)}
                          >
                            {selectedContent.seoTitle === title ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Selected
                              </>
                            ) : (
                              "Use this"
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Podcast Titles */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Podcast Titles</Label>
                    <div className="space-y-2">
                      {workflow.generatedContent.titles?.podcast_titles?.map((title: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                          <span className="flex-1 text-sm">{title}</span>
                          <Button variant="ghost" size="sm" onClick={() => handleCopyTitle(title, "podcast")}>
                            {copiedTitle === `podcast-${title}` ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blog Post Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Blog Post</Label>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{workflow.generatedContent.blog_post?.word_count} words</span>
                        <span>•</span>
                        <span>{workflow.generatedContent.blog_post?.reading_time} read</span>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-muted/30">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: markdownToHtml(workflow.generatedContent.blog_post?.markdown || ""),
                        }}
                      />
                    </div>

                    <div className="flex gap-2">
                      {/* View Full Blog Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1 bg-transparent">
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Blog
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Full Blog Post</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh] pr-4">
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: markdownToHtml(workflow.generatedContent.blog_post?.markdown || ""),
                              }}
                            />
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        onClick={() =>
                          navigator.clipboard.writeText(workflow.generatedContent.blog_post?.markdown || "")
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>

                      <Button
                        variant={
                          selectedContent.blogPostMarkdown === workflow.generatedContent.blog_post?.markdown
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          handleUseContent("blogPost", workflow.generatedContent.blog_post?.markdown || "")
                        }
                      >
                        {selectedContent.blogPostMarkdown === workflow.generatedContent.blog_post?.markdown ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Selected
                          </>
                        ) : (
                          "Use this"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Show Notes Preview */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Show Notes</Label>
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                      <div
                        dangerouslySetInnerHTML={{ __html: showNotesToHtml(workflow.generatedContent.show_notes) }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1 bg-transparent">
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Show Notes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Complete Show Notes</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-6">
                              <div>
                                <h3 className="font-semibold mb-2">Episode Summary</h3>
                                <p className="text-sm text-muted-foreground">
                                  {workflow.generatedContent.show_notes?.episode_summary}
                                </p>
                              </div>

                              <div>
                                <h3 className="font-semibold mb-2">Key Topics Discussed</h3>
                                <ul className="text-sm space-y-1 list-disc list-inside">
                                  {workflow.generatedContent.show_notes?.key_topics_discussed?.map(
                                    (topic: string, idx: number) => (
                                      <li key={idx}>{topic}</li>
                                    ),
                                  )}
                                </ul>
                              </div>

                              <div>
                                <h3 className="font-semibold mb-2">Key Takeaways</h3>
                                <ul className="text-sm space-y-1 list-disc list-inside">
                                  {workflow.generatedContent.show_notes?.key_takeaways?.map(
                                    (takeaway: string, idx: number) => (
                                      <li key={idx}>{takeaway}</li>
                                    ),
                                  )}
                                </ul>
                              </div>

                              {workflow.generatedContent.show_notes?.notable_quotes && (
                                <div>
                                  <h3 className="font-semibold mb-2">Notable Quotes</h3>
                                  <div className="space-y-2">
                                    {workflow.generatedContent.show_notes.notable_quotes.map(
                                      (quote: string, idx: number) => (
                                        <blockquote key={idx} className="border-l-4 pl-4 italic text-sm">
                                          "{quote}"
                                        </blockquote>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                              {workflow.generatedContent.show_notes?.timestamps && (
                                <div>
                                  <h3 className="font-semibold mb-2">Timestamps</h3>
                                  <div className="space-y-2">
                                    {workflow.generatedContent.show_notes.timestamps.map((ts: any, idx: number) => (
                                      <div key={idx} className="text-sm">
                                        <span className="font-mono font-medium">{ts.time}</span> - {ts.topic}
                                        {ts.description && (
                                          <p className="text-muted-foreground ml-16">{ts.description}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant={
                          selectedContent.showNotesMarkdown ===
                          showNotesToMarkdown(workflow.generatedContent.show_notes)
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          handleUseContent("showNotes", showNotesToMarkdown(workflow.generatedContent.show_notes))
                        }
                      >
                        {selectedContent.showNotesMarkdown ===
                        showNotesToMarkdown(workflow.generatedContent.show_notes) ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Selected
                          </>
                        ) : (
                          "Use this"
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGenerateContent}
                    disabled={generating}
                    className="w-full bg-transparent"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate Content"
                    )}
                  </Button>
                </div>
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
