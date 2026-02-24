"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  Search,
  Ruler,
  HardHat,
  Hammer,
  Sparkles,
  CheckCircle,
} from "lucide-react"

interface GenerationOverlayProps {
  isVisible: boolean
  isAiDone: boolean
  onComplete: () => void
  onCancel: () => void
}

const phases = [
  { min: 0, max: 20, text: "Analyzing your project...", Icon: Search },
  { min: 20, max: 40, text: "Measuring materials...", Icon: Ruler },
  { min: 40, max: 60, text: "Calculating labor costs...", Icon: HardHat },
  { min: 60, max: 80, text: "Building your estimate...", Icon: Hammer },
  { min: 80, max: 95, text: "Finishing touches...", Icon: Sparkles },
  { min: 95, max: 100, text: "Almost ready!", Icon: CheckCircle },
]

export function GenerationOverlay({
  isVisible,
  isAiDone,
  onComplete,
  onCancel,
}: GenerationOverlayProps) {
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)

  // Refs to hold latest callback and prevent re-entry without triggering re-renders
  const onCompleteRef = useRef(onComplete)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Progress simulation
  useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      setExiting(false)
      hasCompletedRef.current = false
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isAiDone) return Math.min(prev + 4, 100)
        // Smooth curve that keeps moving — never fully stalls
        if (prev < 20) return prev + 1.2
        if (prev < 45) return prev + 0.6
        if (prev < 65) return prev + 0.35
        if (prev < 80) return prev + 0.15
        if (prev < 92) return prev + 0.08
        return Math.min(prev + 0.02, 94) // Creep slowly to 94 max
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isVisible, isAiDone])

  // Handle completion when progress hits 100
  // Uses a ref guard (not state) so setExiting doesn't trigger cleanup that kills the timer
  useEffect(() => {
    if (progress >= 100 && isVisible && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      setExiting(true) // triggers fade-out animation only
      setTimeout(() => {
        onCompleteRef.current()
      }, 500)
    }
  }, [progress, isVisible])

  // Determine current phase
  const currentPhase = useMemo(() => {
    for (let i = phases.length - 1; i >= 0; i--) {
      if (progress >= phases[i].min) return phases[i]
    }
    return phases[0]
  }, [progress])

  if (!isVisible) return null

  const PhaseIcon = currentPhase.Icon

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/95 backdrop-blur-sm ${
        exiting ? "animate-fade-out" : "animate-fade-in"
      }`}
    >
      <div className="max-w-md w-full mx-4 text-center">
        {/* Phase icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-orange/20 mb-4">
            <PhaseIcon
              className="h-10 w-10 text-brand-orange"
              style={{ animation: "buildPulse 2s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Phase text */}
        <h2
          key={currentPhase.text}
          className="text-xl font-semibold text-white mb-2 animate-fade-in"
        >
          {currentPhase.text}
        </h2>

        <p className="text-sm text-white/60 mb-8">
          Watch Your Estimate Get Built
        </p>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden mb-3">
          <div
            className="h-full bg-brand-orange rounded-full transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 10px rgba(233, 69, 96, 0.5)",
            }}
          />
        </div>

        {/* Progress percentage */}
        <p className="text-xs text-white/40 tabular-nums mb-10">
          {Math.round(progress)}%
        </p>

        {/* Cancel */}
        {!isAiDone && (
          <button
            onClick={onCancel}
            className="text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
