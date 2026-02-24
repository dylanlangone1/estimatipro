"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { GenerationOverlay } from "@/components/estimates/generation-overlay"
import { AiPromptMode } from "@/components/estimates/ai-prompt-mode"
import { GuidedQuestionsMode } from "@/components/estimates/guided-questions-mode"
import { ManualSelectionMode } from "@/components/estimates/manual-selection-mode"
import { useToast } from "@/components/ui/toast"
import { MapPin } from "lucide-react"
import type {
  InputMode,
  GenerateEstimatePayload,
  EstimatePreferences,
} from "@/types/estimate-input"

interface EstimateFormProps {
  trades?: string[]
  preferences?: EstimatePreferences
}

const MODE_TITLES: Record<InputMode, { heading: string; subheading: string }> = {
  ai: {
    heading: "Describe the Job",
    subheading:
      "Tell us about the project in your own words. Be as detailed or as brief as you want — the AI will figure out the rest.",
  },
  guided: {
    heading: "Guided Estimate",
    subheading:
      "Answer a few quick questions and we'll build your estimate.",
  },
  manual: {
    heading: "Manual Selection",
    subheading:
      "Pick your trades, project type, and scope items to generate an estimate.",
  },
}

export function EstimateForm({ trades = [], preferences }: EstimateFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [activeMode, setActiveMode] = useState<InputMode>("ai")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAiDone, setIsAiDone] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modeTransitioning, setModeTransitioning] = useState(false)
  const [location, setLocation] = useState("")
  const [projectContext, setProjectContext] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  // Switch mode with fade transition
  function switchMode(mode: InputMode) {
    setModeTransitioning(true)
    setError(null)
    setTimeout(() => {
      setActiveMode(mode)
      setModeTransitioning(false)
    }, 200)
  }

  // Shared generate handler — works for all three modes
  async function handleGenerate(payload: GenerateEstimatePayload) {
    // Validate AI mode description length
    if (payload.mode === "ai" && payload.description.trim().length < 10) {
      setError("Please describe the project in at least 10 characters.")
      return
    }

    setIsGenerating(true)
    setIsAiDone(false)
    setGeneratedId(null)
    setError(null)

    // Capture project context for the loading overlay
    const ctx = payload.mode === "ai"
      ? payload.description
      : payload.mode === "guided"
        ? `${payload.projectType || ""} ${payload.sqft ? payload.sqft + " SF" : ""} ${payload.qualityLevel || ""} ${(payload.trades || []).join(", ")}`.trim()
        : `${payload.projectType || ""} ${(payload.trades || []).join(", ")}`.trim()
    setProjectContext(ctx)

    // Inject location into payload if provided
    const payloadWithLocation = {
      ...payload,
      ...(location.trim() ? { location: location.trim() } : {}),
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadWithLocation),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate estimate")
      }

      const data = await res.json()
      setGeneratedId(data.id)
      setIsAiDone(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return
      }
      toast({
        title: "Generation failed",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        variant: "error",
      })
      setIsGenerating(false)
      setIsAiDone(false)
    }
  }

  const handleOverlayComplete = useCallback(() => {
    if (generatedId) {
      router.push(`/estimate/${generatedId}?new=true`)
    }
  }, [generatedId, router])

  function handleOverlayCancel() {
    abortControllerRef.current?.abort()
    setIsGenerating(false)
    setIsAiDone(false)
    setGeneratedId(null)
  }

  const { heading, subheading } = MODE_TITLES[activeMode]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{heading}</h1>
        <p className="text-muted">{subheading}</p>
      </div>

      {/* Project Location (optional, applies to all modes) */}
      <div className="mb-4 flex items-center gap-2 max-w-md mx-auto">
        <MapPin className="h-4 w-4 text-muted shrink-0" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Project location (city, state or zip) — optional"
          className="flex-1 text-sm bg-transparent border-b border-card-border focus:border-brand-orange text-foreground placeholder:text-muted/60 py-1 focus:outline-none transition-colors"
          disabled={isGenerating}
        />
      </div>

      {/* Active mode component */}
      <div
        className={`transition-opacity duration-200 ${
          modeTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        {activeMode === "ai" && (
          <AiPromptMode
            key="ai"
            trades={trades}
            onGenerate={handleGenerate}
            onSwitchMode={switchMode}
            isGenerating={isGenerating}
            error={error}
            onClearError={() => setError(null)}
          />
        )}

        {activeMode === "guided" && (
          <GuidedQuestionsMode
            key="guided"
            preferences={preferences}
            onGenerate={handleGenerate}
            onBack={() => switchMode("ai")}
            isGenerating={isGenerating}
          />
        )}

        {activeMode === "manual" && (
          <ManualSelectionMode
            key="manual"
            preferences={preferences}
            onGenerate={handleGenerate}
            onBack={() => switchMode("ai")}
            isGenerating={isGenerating}
          />
        )}
      </div>

      {/* Full-screen generation overlay */}
      <GenerationOverlay
        isVisible={isGenerating}
        isAiDone={isAiDone}
        onComplete={handleOverlayComplete}
        onCancel={handleOverlayCancel}
        projectContext={projectContext}
      />
    </div>
  )
}
