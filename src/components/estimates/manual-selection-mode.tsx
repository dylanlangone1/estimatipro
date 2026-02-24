"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ChipSelect } from "@/components/ui/chip-select"
import { PROJECT_TYPES } from "@/lib/project-types"
import { QUALITY_LEVELS } from "@/lib/quality-levels"
import { INPUT_TRADES } from "@/lib/input-trades"
import { SCOPE_ITEMS } from "@/lib/scope-items"
import { Sparkles, ArrowLeft } from "lucide-react"
import type { ManualModePayload, EstimatePreferences } from "@/types/estimate-input"

interface ManualSelectionModeProps {
  preferences?: EstimatePreferences
  onGenerate: (payload: ManualModePayload) => void
  onBack: () => void
  isGenerating: boolean
}

const projectOptions = PROJECT_TYPES.map((p) => ({ value: p.key, label: p.label }))
const tradeOptions = INPUT_TRADES.map((t) => ({ value: t, label: t }))
const qualityOptions = QUALITY_LEVELS.map((q) => ({ value: q.key, label: q.label }))

export function ManualSelectionMode({
  preferences,
  onGenerate,
  onBack,
  isGenerating,
}: ManualSelectionModeProps) {
  const [trades, setTrades] = useState<string[]>(preferences?.lastTrades || [])
  const [projectType, setProjectType] = useState(preferences?.lastProjectType || "")
  const [scopeItems, setScopeItems] = useState<string[]>([])
  const [qualityLevel, setQualityLevel] = useState(preferences?.lastQualityLevel || "")
  const [notes, setNotes] = useState("")

  // Scope items for the selected project type
  const availableScopes = projectType
    ? (SCOPE_ITEMS[projectType] || SCOPE_ITEMS.custom_other).map((s) => ({
        value: s,
        label: s,
      }))
    : []

  function handleProjectTypeChange(value: string) {
    setProjectType(value)
    // Clear scope items that no longer belong
    const newScopes = SCOPE_ITEMS[value] || SCOPE_ITEMS.custom_other
    setScopeItems((prev) => prev.filter((s) => newScopes.includes(s)))
  }

  const canGenerate = projectType && scopeItems.length > 0
  const itemCount = scopeItems.length

  function handleGenerate() {
    if (!canGenerate) return
    onGenerate({
      mode: "manual",
      trades,
      projectType,
      scopeItems,
      qualityLevel: qualityLevel || "standard",
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="animate-fade-in">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Section 1: Trades */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Trade(s)
            </h3>
            <ChipSelect
              options={tradeOptions}
              value={trades}
              onChange={setTrades}
              multi
            />
          </div>

          {/* Section 2: Project Type */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Project Type
            </h3>
            <ChipSelect
              options={projectOptions}
              value={projectType}
              onChange={handleProjectTypeChange}
            />
          </div>

          {/* Section 3: Scope Items (only after project type selected) */}
          {projectType && (
            <div className="animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1">
                Scope Items
              </h3>
              <p className="text-xs text-muted mb-3">
                Select items to include in your estimate
              </p>
              <ChipSelect
                options={availableScopes}
                value={scopeItems}
                onChange={setScopeItems}
                multi
              />
            </div>
          )}

          {/* Section 4: Quality Level */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Quality Level
            </h3>
            <ChipSelect
              options={qualityOptions}
              value={qualityLevel}
              onChange={setQualityLevel}
            />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUALITY_LEVELS.map((q) => (
                <p key={q.key} className="text-xs text-muted text-center">
                  {q.description}
                </p>
              ))}
            </div>
          </div>

          {/* Section 5: Notes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Notes <span className="font-normal text-muted">(optional)</span>
            </h3>
            <Textarea
              placeholder="e.g. quartz counters, undermount sink..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isGenerating}
            />
          </div>

          {/* Generate button */}
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Spinner size="sm" className="mr-2 text-white" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Estimate{itemCount > 0 ? ` (${itemCount} items)` : ""}
              </>
            )}
          </Button>
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
