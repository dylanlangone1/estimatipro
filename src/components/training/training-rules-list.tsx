"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Trash2, Zap } from "lucide-react"
import { updateTrainingRule, deleteTrainingRule } from "@/actions/training-actions"

interface TrainingRuleData {
  id: string
  content: string
  category: string
  priority: string
  source: string
  isActive: boolean
  timesApplied: number
  createdAt: string
}

const priorityConfig: Record<string, { variant: "error" | "warning" | "info"; label: string }> = {
  CRITICAL: { variant: "error", label: "Critical" },
  IMPORTANT: { variant: "warning", label: "Important" },
  PREFERENCE: { variant: "info", label: "Preference" },
}

const sourceLabels: Record<string, string> = {
  MANUAL: "Manual",
  AUTO_LEARNED: "Auto-learned",
  CORRECTION: "From Correction",
}

export function TrainingRulesList({ rules: initialRules }: { rules: TrainingRuleData[] }) {
  const [rules, setRules] = useState(initialRules)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleToggle(id: string, currentActive: boolean) {
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !currentActive } : r))
    )
    try {
      await updateTrainingRule({ id, isActive: !currentActive })
    } catch {
      // Revert on error
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: currentActive } : r))
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule? This cannot be undone.")) return
    setDeletingId(id)
    try {
      await deleteTrainingRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch {
      // Keep rule on error
    } finally {
      setDeletingId(null)
    }
  }

  // Group by priority
  const grouped = {
    CRITICAL: rules.filter((r) => r.priority === "CRITICAL"),
    IMPORTANT: rules.filter((r) => r.priority === "IMPORTANT"),
    PREFERENCE: rules.filter((r) => r.priority === "PREFERENCE"),
  }

  if (rules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted" />
            <h2 className="font-semibold text-foreground">Active Rules</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm text-center py-4">
            No training rules yet. Use Quick Teach above to add your first rule.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold text-foreground">Active Rules</h2>
          </div>
          <span className="text-sm text-muted">{rules.length} rules</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-card-border">
          {(["CRITICAL", "IMPORTANT", "PREFERENCE"] as const).map((priority) => {
            const group = grouped[priority]
            if (group.length === 0) return null
            const config = priorityConfig[priority]

            return (
              <div key={priority}>
                <div className="px-6 py-2 bg-card/50">
                  <Badge variant={config.variant} className="text-xs">
                    {config.label}
                  </Badge>
                </div>
                {group.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-start gap-4 px-6 py-3 ${
                      !rule.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{rule.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="default" className="text-xs">
                          {rule.category}
                        </Badge>
                        {rule.source !== "MANUAL" && (
                          <Badge variant="info" className="text-xs">
                            {sourceLabels[rule.source] || rule.source}
                          </Badge>
                        )}
                        {rule.timesApplied > 0 && (
                          <span className="text-xs text-muted flex items-center gap-0.5">
                            <Zap className="h-3 w-3" />
                            Used {rule.timesApplied}x
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(rule.id, rule.isActive)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          rule.isActive ? "bg-brand-orange" : "bg-card-border"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            rule.isActive ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>

                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deletingId === rule.id}
                        className="text-muted hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
