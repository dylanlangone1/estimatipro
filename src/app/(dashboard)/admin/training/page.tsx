import { Card, CardContent } from "@/components/ui/card"
import { QuickTeachForm } from "@/components/training/quick-teach-form"
import { TrainingRulesList } from "@/components/training/training-rules-list"
import { CorrectionLogList } from "@/components/training/correction-log-list"
import {
  getTrainingRules,
  getCorrectionLogs,
  getTrainingStats,
} from "@/actions/training-actions"
import { BookOpen, Zap, Brain, History } from "lucide-react"

export default async function TrainingPage() {
  const [rules, corrections, stats] = await Promise.all([
    getTrainingRules(),
    getCorrectionLogs(),
    getTrainingStats(),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Training</h1>
        <p className="text-muted mt-1">
          Teach your AI permanent rules, review auto-learned patterns, and track
          how corrections improve future estimates.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <BookOpen className="h-6 w-6 text-brand-orange mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.totalRules}</p>
            <p className="text-xs text-muted">Total Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Zap className="h-6 w-6 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.activeRules}</p>
            <p className="text-xs text-muted">Active Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Brain className="h-6 w-6 text-info mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.autoLearnedCount}</p>
            <p className="text-xs text-muted">Auto-Learned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <History className="h-6 w-6 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.correctionCount}</p>
            <p className="text-xs text-muted">Corrections</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Teach */}
      <QuickTeachForm />

      {/* Active Rules */}
      <TrainingRulesList rules={rules} />

      {/* Correction Log */}
      <CorrectionLogList corrections={corrections} />
    </div>
  )
}
