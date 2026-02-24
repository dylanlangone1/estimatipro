"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, ArrowRight, CheckCircle, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface CorrectionData {
  id: string
  estimateId: string
  estimateTitle: string
  correctionType: string
  fieldPath: string
  previousValue: string
  newValue: string
  context: string | null
  extractedRule: string | null
  similarCount: number
  promotedToRule: boolean
  createdAt: string
}

const correctionTypeLabels: Record<string, { label: string; variant: "default" | "info" | "warning" | "error" }> = {
  PRICE_CHANGE: { label: "Price", variant: "warning" },
  ITEM_ADDED: { label: "Added", variant: "info" },
  ITEM_REMOVED: { label: "Removed", variant: "error" },
  QUANTITY_CHANGE: { label: "Qty", variant: "default" },
  CATEGORY_CHANGE: { label: "Category", variant: "default" },
  DESCRIPTION_CHANGE: { label: "Description", variant: "default" },
  MARKUP_CHANGE: { label: "Markup", variant: "warning" },
  ASSUMPTION_CHANGE: { label: "Assumption", variant: "default" },
}

export function CorrectionLogList({ corrections }: { corrections: CorrectionData[] }) {
  if (corrections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted" />
            <h2 className="font-semibold text-foreground">Correction Log</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted text-sm text-center py-4">
            No corrections logged yet. Edit an estimate and the AI will learn from your changes.
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
            <History className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold text-foreground">Correction Log</h2>
          </div>
          <span className="text-sm text-muted">{corrections.length} corrections</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-card-border">
          {corrections.map((correction) => {
            const typeConfig = correctionTypeLabels[correction.correctionType] || {
              label: correction.correctionType,
              variant: "default" as const,
            }

            return (
              <div key={correction.id} className="px-6 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={typeConfig.variant} className="text-xs">
                        {typeConfig.label}
                      </Badge>
                      <span className="text-xs text-muted truncate">
                        {correction.estimateTitle}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(correction.createdAt)}
                      </span>
                    </div>

                    {/* Change display */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted line-through truncate max-w-[200px]">
                        {correction.previousValue}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted shrink-0" />
                      <span className="text-foreground font-medium truncate max-w-[200px]">
                        {correction.newValue}
                      </span>
                    </div>

                    {/* Extracted rule */}
                    {correction.extractedRule && (
                      <p className="text-xs text-brand-orange mt-1.5 italic">
                        Learned: &quot;{correction.extractedRule}&quot;
                      </p>
                    )}
                  </div>

                  {/* Status badges */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {correction.promotedToRule ? (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-0.5" />
                        Promoted
                      </Badge>
                    ) : correction.similarCount >= 2 ? (
                      <Badge variant="warning" className="text-xs">
                        <Clock className="h-3 w-3 mr-0.5" />
                        {correction.similarCount}/3
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
