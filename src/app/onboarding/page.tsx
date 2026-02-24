"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TRADE_LIST } from "@/lib/trades"
import { saveTradeSelection } from "@/actions/onboarding-actions"

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])
  const [primaryTrade, setPrimaryTrade] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTrade(key: string) {
    setSelectedTrades((prev) => {
      const next = prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
      // If removing the primary trade, reset it
      if (primaryTrade === key && !next.includes(key)) {
        setPrimaryTrade(next.length > 0 ? next[0] : null)
      }
      // Auto-set primary if only one selected
      if (next.length === 1) {
        setPrimaryTrade(next[0])
      }
      return next
    })
  }

  async function handleContinue() {
    if (selectedTrades.length === 0) {
      setError("Please select at least one trade.")
      return
    }

    const primary = primaryTrade || selectedTrades[0]
    setSaving(true)
    setError(null)

    try {
      await saveTradeSelection(selectedTrades, primary)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-charcoal flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="font-bold text-2xl tracking-tight">
            <span className="text-white">ESTIM</span>
            <span className="text-brand-orange">AI</span>
            <span className="text-white"> PRO</span>
          </span>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">
            What do you do?
          </h1>
          <p className="text-gray-400 text-lg">
            Select your trades so we can tailor estimates to your specialty.
            Pick as many as apply.
          </p>
        </div>

        {/* Trade Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          {TRADE_LIST.map((trade) => {
            const isSelected = selectedTrades.includes(trade.key)
            const isPrimary = primaryTrade === trade.key
            return (
              <button
                key={trade.key}
                onClick={() => toggleTrade(trade.key)}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  cursor-pointer text-center
                  ${
                    isSelected
                      ? "border-brand-orange bg-brand-orange/10 text-white"
                      : "border-gray-700 bg-brand-charcoal-light text-gray-300 hover:border-gray-500"
                  }
                `}
              >
                <span className="text-2xl">{trade.icon}</span>
                <span className="text-sm font-medium leading-tight">{trade.label}</span>
                {isPrimary && selectedTrades.length > 1 && (
                  <span className="absolute top-1 right-1 text-[10px] bg-brand-orange text-white px-1.5 py-0.5 rounded-full font-semibold">
                    PRIMARY
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Primary Trade Selector (shown when multiple selected) */}
        {selectedTrades.length > 1 && (
          <div className="mb-8 bg-brand-charcoal-light rounded-xl p-4 border border-gray-700">
            <p className="text-gray-300 text-sm mb-3">
              Which is your <span className="text-brand-orange font-semibold">primary</span> trade?
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTrades.map((key) => {
                const trade = TRADE_LIST.find((t) => t.key === key)
                if (!trade) return null
                return (
                  <button
                    key={key}
                    onClick={() => setPrimaryTrade(key)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${
                        primaryTrade === key
                          ? "bg-brand-orange text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }
                    `}
                  >
                    {trade.icon} {trade.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-error text-sm mb-4">{error}</p>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={saving || selectedTrades.length === 0}
            className="min-w-[220px] text-base"
          >
            {saving ? "Saving..." : "Continue →"}
          </Button>
          <p className="text-gray-500 text-sm mt-4">
            You can always update your trades later in Settings.
          </p>
        </div>
      </div>
    </div>
  )
}
