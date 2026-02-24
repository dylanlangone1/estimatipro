"use client"

import { cn } from "@/lib/utils"

interface WizardProgressProps {
  totalSteps: number
  currentStep: number
  labels?: string[]
}

export function WizardProgress({ totalSteps, currentStep, labels }: WizardProgressProps) {
  return (
    <div className="w-full mb-6">
      {/* Progress bar */}
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full flex-1 transition-colors duration-300",
              i < currentStep
                ? "bg-brand-orange"
                : i === currentStep
                  ? "bg-brand-orange animate-pulse"
                  : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {/* Step labels */}
      {labels && (
        <div className="flex justify-between mt-2">
          {labels.map((label, i) => (
            <span
              key={i}
              className={cn(
                "text-xs transition-colors duration-300",
                i <= currentStep ? "text-brand-orange font-medium" : "text-muted"
              )}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Step indicator */}
      <p className="text-xs text-muted mt-2">
        Step {currentStep + 1} of {totalSteps}
      </p>
    </div>
  )
}
