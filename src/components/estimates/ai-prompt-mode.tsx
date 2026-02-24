"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Sparkles, ListChecks, Wrench } from "lucide-react"
import { getPromptsForTrades } from "@/lib/sample-prompts"
import type { InputMode, AiModePayload } from "@/types/estimate-input"

interface AiPromptModeProps {
  trades: string[]
  onGenerate: (payload: AiModePayload) => void
  onSwitchMode: (mode: InputMode) => void
  isGenerating: boolean
  error: string | null
  onClearError: () => void
}

export function AiPromptMode({
  trades,
  onGenerate,
  onSwitchMode,
  isGenerating,
  error,
  onClearError,
}: AiPromptModeProps) {
  const [description, setDescription] = useState("")
  const [promptIndex, setPromptIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  const samplePrompts = useMemo(() => getPromptsForTrades(trades), [trades])
  const currentPrompt = samplePrompts[promptIndex % samplePrompts.length] || ""

  // Rotate prompts every 8 seconds
  useEffect(() => {
    if (description.length > 0 || samplePrompts.length === 0) return

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setPromptIndex((prev) => (prev + 1) % samplePrompts.length)
        setFadeIn(true)
      }, 300)
    }, 8000)

    return () => clearInterval(interval)
  }, [description.length, samplePrompts.length])

  const handleTryThis = useCallback(() => {
    setDescription(currentPrompt)
    onClearError()
  }, [currentPrompt, onClearError])

  function handleGenerate() {
    if (!description.trim() || description.trim().length < 10) return
    onGenerate({ mode: "ai", description: description.trim() })
  }

  return (
    <div className="animate-fade-in">
      <Card>
        <CardContent className="p-6">
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              if (error) onClearError()
            }}
            placeholder={currentPrompt || "Describe your project here..."}
            rows={8}
            className="text-base"
            disabled={isGenerating}
            error={error || undefined}
          />

          {/* Rotating sample prompt preview */}
          {description.length === 0 && samplePrompts.length > 0 && (
            <div
              className={`mt-3 transition-opacity duration-300 ${
                fadeIn ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                onClick={handleTryThis}
                className="text-sm text-brand-orange hover:text-brand-orange-hover font-medium transition-colors cursor-pointer"
              >
                Try this →
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted">
              {description.length > 0
                ? `${description.length} characters`
                : "The more detail you provide, the better the estimate"}
            </p>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || description.trim().length < 10}
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Spinner size="sm" className="mr-2 text-white" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Estimate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mode switch buttons */}
      {!isGenerating && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => onSwitchMode("guided")}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-card-border text-sm font-medium text-muted hover:text-foreground hover:border-brand-orange/40 hover:bg-white transition-all duration-150 cursor-pointer"
          >
            <ListChecks className="h-4 w-4" />
            Guided Questions
          </button>
          <button
            onClick={() => onSwitchMode("manual")}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-card-border text-sm font-medium text-muted hover:text-foreground hover:border-brand-orange/40 hover:bg-white transition-all duration-150 cursor-pointer"
          >
            <Wrench className="h-4 w-4" />
            Manual Selection
          </button>
        </div>
      )}
    </div>
  )
}
