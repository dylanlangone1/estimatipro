"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import { Sparkles, Save, RotateCcw, Layers } from "lucide-react"

interface FinishLevel {
  name: string
  description: string
  materialExamples: string[]
  priceMultiplier: number
}

export function FinishLevelsSettings() {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [levels, setLevels] = useState<FinishLevel[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load existing levels on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/finish-levels")
        if (res.ok) {
          const data = await res.json()
          if (data.levels) {
            setLevels(data.levels)
          }
        }
      } catch {
        // Ignore — will just show empty state
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)

    try {
      const res = await fetch("/api/settings/finish-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate")
      }

      const data = await res.json()
      setLevels(data.levels)
      toast({ title: "Finish levels generated!", variant: "success" })
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!levels || isSaving) return
    setIsSaving(true)

    try {
      const res = await fetch("/api/settings/finish-levels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levels }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      toast({ title: "Finish levels saved!", variant: "success" })
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand-orange" />
          <h2 className="font-semibold text-foreground">Custom Finish Levels</h2>
        </div>
        <p className="text-sm text-muted">
          Describe your quality tiers and AI will structure them for use in estimates.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Describe your finish levels
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"My budget level uses Formica counters, LVP flooring, and basic paint. Standard uses quartz countertops, hardwood floors, and Sherwin-Williams paint. Premium uses marble or granite, custom tile, and designer fixtures..."}
            className="w-full text-sm bg-background border border-card-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 resize-none"
            rows={4}
          />
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Spinner size="sm" className="mr-1.5" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Generate Finish Levels
              </>
            )}
          </Button>
        </div>

        {/* Preview levels */}
        {levels && levels.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Your Finish Levels
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLevels(null)}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Spinner size="sm" className="mr-1" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {levels.map((level, i) => (
                <div
                  key={i}
                  className="p-3 bg-background border border-card-border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground text-sm">
                      {level.name}
                    </span>
                    <span className="text-xs text-muted bg-card px-2 py-0.5 rounded-full border border-card-border">
                      {level.priceMultiplier}x
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-2">{level.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {level.materialExamples.map((ex, j) => (
                      <span
                        key={j}
                        className="text-xs px-2 py-0.5 bg-brand-orange/10 text-brand-orange rounded-full"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
