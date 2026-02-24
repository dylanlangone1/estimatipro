"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ChipSelect } from "@/components/ui/chip-select"
import { WizardProgress } from "@/components/ui/wizard-progress"
import { PROJECT_TYPES } from "@/lib/project-types"
import { QUALITY_LEVELS } from "@/lib/quality-levels"
import { INPUT_TRADES } from "@/lib/input-trades"
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react"
import type { GuidedModePayload, EstimatePreferences } from "@/types/estimate-input"

interface GuidedQuestionsModeProps {
  preferences?: EstimatePreferences
  onGenerate: (payload: GuidedModePayload) => void
  onBack: () => void
  isGenerating: boolean
}

const STEP_LABELS = ["Type", "Trades", "Size", "Quality", "Notes"]
const TOTAL_STEPS = 5

const projectOptions = PROJECT_TYPES.map((p) => ({ value: p.key, label: p.label }))
const tradeOptions = INPUT_TRADES.map((t) => ({ value: t, label: t }))
const qualityOptions = QUALITY_LEVELS.map((q) => ({ value: q.key, label: q.label }))

export function GuidedQuestionsMode({
  preferences,
  onGenerate,
  onBack,
  isGenerating,
}: GuidedQuestionsModeProps) {
  const [step, setStep] = useState(0)
  const [projectType, setProjectType] = useState(preferences?.lastProjectType || "")
  const [trades, setTrades] = useState<string[]>(preferences?.lastTrades || [])
  const [sqft, setSqft] = useState("")
  const [qualityLevel, setQualityLevel] = useState(preferences?.lastQualityLevel || "")
  const [notes, setNotes] = useState("")
  const [transitioning, setTransitioning] = useState(false)

  const goToStep = useCallback(
    (nextStep: number) => {
      setTransitioning(true)
      setTimeout(() => {
        setStep(nextStep)
        setTransitioning(false)
      }, 200)
    },
    []
  )

  function handleProjectSelect(value: string) {
    setProjectType(value)
    setTimeout(() => goToStep(1), 200)
  }

  function handleQualitySelect(value: string) {
    setQualityLevel(value)
    setTimeout(() => goToStep(4), 200)
  }

  function handleGenerate() {
    onGenerate({
      mode: "guided",
      projectType,
      trades,
      sqft,
      qualityLevel,
      notes: notes.trim() || undefined,
    })
  }

  function handleSqftKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && sqft.trim()) {
      e.preventDefault()
      goToStep(3)
    }
  }

  return (
    <div className="animate-fade-in">
      <WizardProgress
        totalSteps={TOTAL_STEPS}
        currentStep={step}
        labels={STEP_LABELS}
      />

      <Card>
        <CardContent className="p-6">
          <div
            className={`transition-opacity duration-200 ${
              transitioning ? "opacity-0" : "opacity-100"
            }`}
          >
            {/* Step 0: Project Type */}
            {step === 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  What type of project?
                </h3>
                <p className="text-sm text-muted mb-4">
                  Select one to continue
                </p>
                <ChipSelect
                  options={projectOptions}
                  value={projectType}
                  onChange={handleProjectSelect}
                />
              </div>
            )}

            {/* Step 1: Trades */}
            {step === 1 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Which trades are involved?
                </h3>
                <p className="text-sm text-muted mb-4">
                  Select all that apply
                </p>
                <ChipSelect
                  options={tradeOptions}
                  value={trades}
                  onChange={setTrades}
                  multi
                />
                {trades.length > 0 && (
                  <div className="mt-5 flex justify-end">
                    <Button onClick={() => goToStep(2)}>
                      Next — {trades.length} selected
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Square Footage */}
            {step === 2 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Approximate square footage?
                </h3>
                <p className="text-sm text-muted mb-4">
                  Enter the project area in square feet
                </p>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 200"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  onKeyDown={handleSqftKeyDown}
                  autoFocus
                  className="text-lg max-w-xs"
                />
                {sqft.trim() && (
                  <div className="mt-5 flex justify-end">
                    <Button onClick={() => goToStep(3)}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Quality Level */}
            {step === 3 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Quality level?
                </h3>
                <p className="text-sm text-muted mb-4">
                  This affects material and finish pricing
                </p>
                <ChipSelect
                  options={qualityOptions}
                  value={qualityLevel}
                  onChange={handleQualitySelect}
                />
                {/* Quality descriptions */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUALITY_LEVELS.map((q) => (
                    <p
                      key={q.key}
                      className="text-xs text-muted text-center"
                    >
                      {q.description}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Notes */}
            {step === 4 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Any additional details?
                </h3>
                <p className="text-sm text-muted mb-4">
                  Optional — materials, finishes, special requirements
                </p>
                <Textarea
                  placeholder="e.g. quartz counters, undermount sink, LVP flooring..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="text-base"
                  disabled={isGenerating}
                />
                <div className="mt-5 flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isGenerating}
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
              </div>
            )}
          </div>

          {/* Back within wizard */}
          {step > 0 && !isGenerating && (
            <button
              onClick={() => goToStep(step - 1)}
              className="mt-4 inline-flex items-center text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Previous step
            </button>
          )}
        </CardContent>
      </Card>

      {/* Back to prompt */}
      {!isGenerating && (
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to prompt
        </button>
      )}
    </div>
  )
}
