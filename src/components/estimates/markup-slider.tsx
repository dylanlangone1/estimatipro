"use client"

import { useRef, useCallback, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Percent, DollarSign, TrendingUp } from "lucide-react"

interface MarkupSliderProps {
  subtotal: number
  taxAmount: number
  markupPercent: number
  estimateId: string
  onMarkupChange: (markupPercent: number, markupAmount: number, totalAmount: number) => void
}

export function MarkupSlider({
  subtotal,
  taxAmount,
  markupPercent,
  estimateId,
  onMarkupChange,
}: MarkupSliderProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear debounce timer on unmount to prevent stale requests
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (newPercent: number) => {
      const markupAmount = subtotal * (newPercent / 100)
      const totalAmount = subtotal + markupAmount + taxAmount
      onMarkupChange(newPercent, markupAmount, totalAmount)

      // Debounced save to server
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/estimates/${estimateId}/markup`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markupPercent: newPercent }),
        }).catch((err) => console.error("Failed to save markup:", err))
      }, 500)
    },
    [subtotal, taxAmount, estimateId, onMarkupChange]
  )

  const markupAmount = subtotal * (markupPercent / 100)
  const totalAmount = subtotal + markupAmount + taxAmount

  return (
    <Card>
      <CardContent className="py-4">
        <div className="space-y-4">
          <Slider
            value={markupPercent}
            onChange={handleChange}
            min={0}
            max={100}
            step={0.5}
            label="Markup / Margin"
            formatValue={(v) => `${v}%`}
          />
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-card-border">
              <Percent className="h-4 w-4 text-muted shrink-0" />
              <div>
                <p className="text-[11px] text-muted leading-tight">Markup</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {markupPercent}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-card-border">
              <DollarSign className="h-4 w-4 text-muted shrink-0" />
              <div>
                <p className="text-[11px] text-muted leading-tight">Markup $</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(markupAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-orange/5 border border-brand-orange/20">
              <TrendingUp className="h-4 w-4 text-brand-orange shrink-0" />
              <div>
                <p className="text-[11px] text-muted leading-tight">Client Total</p>
                <p className="text-sm font-bold text-brand-orange tabular-nums">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
