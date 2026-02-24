"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react"
import type { TermsSection } from "@/types/proposal"

export function TermsSettings() {
  const { toast } = useToast()
  const [terms, setTerms] = useState<TermsSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load terms on mount
  useEffect(() => {
    async function loadTerms() {
      try {
        const res = await fetch("/api/settings/terms")
        if (res.ok) {
          const data = await res.json()
          setTerms(data.terms)
        }
      } catch {
        toast({ title: "Failed to load terms", variant: "error" })
      } finally {
        setIsLoading(false)
      }
    }
    loadTerms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateSection(id: string, field: keyof TermsSection, value: string | boolean) {
    setTerms((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
    setHasChanges(true)
  }

  function moveSection(id: string, direction: "up" | "down") {
    setTerms((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const newIdx = direction === "up" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const updated = [...prev]
      const temp = updated[idx]
      updated[idx] = updated[newIdx]
      updated[newIdx] = temp
      return updated
    })
    setHasChanges(true)
  }

  function addSection() {
    const newSection: TermsSection = {
      id: `section_${Date.now()}`,
      title: "",
      content: "",
      enabled: true,
    }
    setTerms((prev) => [...prev, newSection])
    setHasChanges(true)
  }

  function removeSection(id: string) {
    setTerms((prev) => prev.filter((s) => s.id !== id))
    setHasChanges(true)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings/terms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setHasChanges(false)
      toast({ title: "Terms saved", description: "Your terms & conditions have been updated." })
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/settings/terms", {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      const data = await res.json()
      setTerms(data.terms)
      setHasChanges(true)
      toast({
        title: "Terms generated",
        description: "AI-generated terms based on your trade specializations. Review and save.",
      })
    } catch (err) {
      toast({
        title: "Failed to generate",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Terms &amp; Conditions
              </h2>
              <p className="text-sm text-muted mt-1">
                Customize the terms that appear on your client-facing PDFs.
                Toggle sections on/off, reorder, or edit the content.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Spinner size="sm" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isGenerating ? "Generating..." : "AI Generate"}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <Spinner size="sm" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Terms Sections */}
      {terms.map((section, index) => (
        <Card
          key={section.id}
          className={`transition-opacity ${section.enabled ? "" : "opacity-60"}`}
        >
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {/* Reorder & drag handle */}
              <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                <GripVertical className="h-4 w-4 text-muted" />
                <button
                  onClick={() => moveSection(section.id, "up")}
                  disabled={index === 0}
                  className="p-0.5 text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveSection(section.id, "down")}
                  disabled={index === terms.length - 1}
                  className="p-0.5 text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Section number + title */}
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, "title", e.target.value)}
                    placeholder="Section title..."
                    className="flex-1 bg-transparent border-b border-card-border text-sm font-semibold text-foreground focus:outline-none focus:border-brand-orange pb-1"
                  />
                </div>

                {/* Content textarea */}
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(section.id, "content", e.target.value)}
                  placeholder="Terms content..."
                  rows={3}
                  className="w-full bg-background border border-card-border rounded-lg text-sm text-foreground px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <button
                  onClick={() => updateSection(section.id, "enabled", !section.enabled)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    section.enabled
                      ? "text-brand-orange bg-brand-orange/10"
                      : "text-muted bg-card-border/20"
                  }`}
                  title={section.enabled ? "Disable section" : "Enable section"}
                >
                  {section.enabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => removeSection(section.id)}
                  className="p-1.5 text-muted hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title="Remove section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Section */}
      <button
        onClick={addSection}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-card-border rounded-xl text-sm text-muted hover:text-foreground hover:border-brand-orange/40 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Section
      </button>
    </div>
  )
}
