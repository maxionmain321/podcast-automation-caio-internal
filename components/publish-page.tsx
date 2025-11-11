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

  // Editable content
  const [seoTitle, setSeoTitle] = useState("")
  const [blogPostMarkdown, setBlogPostMarkdown] = useState("")
  const [showNotesMarkdown, setShowNotesMarkdown] = useState("")
  const [primaryKeyword, setPrimaryKeyword] = useState("")
  const [secondaryKeywords, setSecondaryKeywords] = useState("")

  useEffect(() => {
    if (!workflow || !workflow.generatedContent) {
      router.push("/dashboard")
    } else {
      // Check if user selected specific content on previous page
      if (workflow.selectedContent?.seoTitle) {
        setSeoTitle(workflow.selectedContent.seoTitle)
      } else {
        setSeoTitle(workflow.generatedContent.seoTitle || "")
      }

      if (workflow.selectedContent?.blogPostMarkdown) {
        setBlogPostMarkdown(workflow.selectedContent.blogPostMarkdown)
      } else {
        setBlogPostMarkdown(workflow.generatedContent.blog_post?.markdown || "")
      }

      if (workflow.selectedContent?.showNotesMarkdown) {
        setShowNotesMarkdown(workflow.selectedContent.showNotesMarkdown)
      } else {
        setShowNotesMarkdown("")
      }

      if (workflow.generatedContent.blog_post?.primary_keyword) {
        setPrimaryKeyword(workflow.generatedContent.blog_post.primary_keyword)
      }
      if (workflow.generatedContent.blog_post?.secondary_keywords) {
        setSecondaryKeywords(
          Array.isArray(workflow.generatedContent.blog_post.secondary_keywords)
            ? workflow.generatedContent.blog_post.secondary_keywords.join(", ")
            : workflow.generatedContent.blog_post.secondary_keywords,
        )
      }
    }
  }, [workflow, router])

  if (!workflow || !workflow.generatedContent) {
    return null
  }

  const handlePublish = async () => {
    console.log("[v0] Publishing with data:", {
      seoTitle,
      blogPostLength: blogPostMarkdown.length,
      primaryKeyword,
      secondaryKeywords,
    })

    if (!seoTitle || !blogPostMarkdown) {
      setError("Please fill in both SEO Title and Blog Post before publishing")
      toast({
        title: "Missing Fields",
        description: "SEO Title and Blog Post are required",
        variant: "destructive",
      })
      return
    }

    setPublishing(true)
    setError("")

    try {
      const response = await fetch("/api/webhook/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seo_title: seoTitle,
          blog_post_markdown: blogPostMarkdown,
          primary_keyword: primaryKeyword,
          secondary_keywords: secondaryKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
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
                    <Label htmlFor="primary-keyword">Primary Keyword</Label>
                    <Input
                      id="primary-keyword"
                      value={primaryKeyword}
                      onChange={(e) => setPrimaryKeyword(e.target.value)}
                      placeholder="Main SEO keyword..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-keywords">Secondary Keywords (comma-separated)</Label>
                    <Input
                      id="secondary-keywords"
                      value={secondaryKeywords}
                      onChange={(e) => setSecondaryKeywords(e.target.value)}
                      placeholder="Related keywords, separated by commas..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blog-post">Blog Post (Markdown)</Label>
                    <Textarea
                      id="blog-post"
                      value={blogPostMarkdown}
                      onChange={(e) => setBlogPostMarkdown(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Blog post content in markdown format..."
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-notes">Show Notes (Markdown)</Label>
                      <Badge variant="outline" className="text-xs">
                        Not published yet
                      </Badge>
                    </div>
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-blue-800 text-sm">
                        <strong>Note:</strong> Show notes are for your reference only and won't be published to
                        WordPress yet. This feature is coming soon.
                      </AlertDescription>
                    </Alert>
                    <Textarea
                      id="show-notes"
                      value={showNotesMarkdown}
                      onChange={(e) => setShowNotesMarkdown(e.target.value)}
                      className="min-h-[150px] font-mono text-sm"
                      placeholder="Show notes for reference (not published)..."
                      disabled
                    />
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
            <>
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

              <Card>
                <CardHeader>
                  <CardTitle>SEO Optimization Checklist</CardTitle>
                  <CardDescription>
                    Complete these steps in WordPress to optimize your post (10 minutes)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4 text-sm">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-semibold text-amber-900 mb-1">1. SET FOCUS KEYWORD (30 sec) ⭐⭐⭐</div>
                          <div className="text-amber-800 space-y-1">
                            <div>→ RankMath panel → Focus Keyword field</div>
                            <div>→ Paste: [{primaryKeyword || "your keyword"}]</div>
                            <div className="text-xs italic">Impact: Score 40 → 65</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-semibold text-blue-900 mb-1">
                            2. UPLOAD FEATURED IMAGE (2 min) ⭐⭐⭐
                          </div>
                          <div className="text-blue-800 space-y-1">
                            <div>→ Unsplash.com → Search keyword</div>
                            <div>→ Download 1200x630px</div>
                            <div>→ Set as Featured Image</div>
                            <div>→ Alt text = focus keyword</div>
                            <div className="text-xs italic">Impact: Score 65 → 75</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-semibold text-purple-900 mb-1">
                            3. ADD 2-3 EXTERNAL LINKS (3 min) ⭐⭐
                          </div>
                          <div className="text-purple-800 space-y-1">
                            <div>→ Link statistics to sources</div>
                            <div>→ Use: McKinsey, HBR, Gartner</div>
                            <div className="text-xs italic">Impact: +5-10 points</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-semibold text-green-900 mb-1">
                            4. ADD 2-3 INTERNAL LINKS (2 min) ⭐⭐
                          </div>
                          <div className="text-green-800 space-y-1">
                            <div>→ Link to related blog posts</div>
                            <div>→ Link to service pages</div>
                            <div className="text-xs italic">Impact: Better site structure</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-semibold text-slate-900 mb-1">5. SET CATEGORIES (30 sec) ⭐</div>
                          <div className="text-slate-800 space-y-1">
                            <div>→ Choose 1-2: AI Strategy, Implementation</div>
                            <div>→ Don't use "Uncategorized"</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-semibold text-indigo-900 mb-1">6. ADD TAGS (1 min) ⭐</div>
                          <div className="text-indigo-800 space-y-1">
                            <div>→ Add 3-5: {secondaryKeywords || "related keywords"}</div>
                            <div>→ Use existing tags when possible</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-semibold text-orange-900 mb-1">7. QUICK REVIEW (2 min) ⭐⭐</div>
                          <div className="text-orange-800 space-y-1">
                            <div>→ Scan headings</div>
                            <div>→ Fix obvious typos</div>
                            <div>→ Verify accuracy</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 rounded-lg">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <div className="font-bold text-green-900 text-base mb-1">8. PUBLISH! 🚀</div>
                          <div className="text-green-800 space-y-1">
                            <div>→ Target RankMath: 75-85/100</div>
                            <div>→ Total time: 10 minutes</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
