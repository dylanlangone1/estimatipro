"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"
import { createTrainingRule } from "@/actions/training-actions"
import { useToast } from "@/components/ui/toast"

const CATEGORIES = [
  { value: "pricing", label: "Pricing" },
  { value: "materials", label: "Materials" },
  { value: "labor", label: "Labor" },
  { value: "general", label: "General" },
]

const PRIORITIES = [
  { value: "CRITICAL", label: "Critical", color: "text-error" },
  { value: "IMPORTANT", label: "Important", color: "text-warning" },
  { value: "PREFERENCE", label: "Preference", color: "text-info" },
]

interface QuickTeachFormProps {
  estimateId?: string
  compact?: boolean
}

export function QuickTeachForm({ compact }: QuickTeachFormProps) {
  const { toast } = useToast()
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [priority, setPriority] = useState("IMPORTANT")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim().length < 5) {
      setError("Rule must be at least 5 characters")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createTrainingRule({ content: content.trim(), category, priority })
      setContent("")
      toast({
        title: "Rule saved",
        description: "The AI will follow this rule in future estimates.",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Failed to save rule",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="e.g., Always use $8/SF for LVP flooring installation"
          className="w-full px-3 py-2 rounded-lg border border-card-border bg-background text-foreground text-sm placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
          rows={2}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  category === cat.value
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-card-border text-muted hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  priority === p.value
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-card-border text-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={isSubmitting || content.trim().length < 5}>
            {isSubmitting ? "Saving..." : "Save Rule"}
          </Button>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </form>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-brand-orange" />
          <h2 className="font-semibold text-foreground">Quick Teach</h2>
        </div>
        <p className="text-sm text-muted">
          Teach the AI a permanent rule it should always follow when generating your estimates.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g., Always use $8/SF for LVP flooring installation in residential projects"
            className="w-full px-4 py-3 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
            rows={3}
          />

          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted mb-1.5">Category</p>
              <div className="flex gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      category === cat.value
                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange font-medium"
                        : "border-card-border text-muted hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted mb-1.5">Priority</p>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      priority === p.value
                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange font-medium"
                        : "border-card-border text-muted hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || content.trim().length < 5}>
              {isSubmitting ? "Saving..." : "Save Rule"}
            </Button>
            {error && <p className="text-sm text-error">{error}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
