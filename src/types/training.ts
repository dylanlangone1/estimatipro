export interface TrainingRuleInput {
  content: string
  category: string
  priority: "CRITICAL" | "IMPORTANT" | "PREFERENCE"
  source?: "MANUAL" | "AUTO_LEARNED" | "CORRECTION"
}

export interface ContextRuleMatch {
  id: string
  triggerType: string
  triggerValue: string
  mustInclude: string[]
  mustExclude: string[]
  mustAssume: string[]
  neverAssume: string[]
}

export interface CoherenceWarning {
  type: "missing_category" | "excluded_item" | "missing_assumption" | "forbidden_assumption"
  message: string
  severity: "error" | "warning"
  autoFixable: boolean
  rule: ContextRuleMatch
}

export interface CoherenceResult {
  passed: boolean
  warnings: CoherenceWarning[]
  matchedRules: ContextRuleMatch[]
}

export interface TrainingContext {
  trainingRules: Array<{ content: string; priority: string; category: string }>
  matchedContextRules: ContextRuleMatch[]
  mergedContext: {
    mustInclude: string[]
    mustExclude: string[]
    mustAssume: string[]
    neverAssume: string[]
  }
  recentCorrections: Array<{ extractedRule: string }>
}
