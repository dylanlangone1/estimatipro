"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface ChipOption {
  value: string
  label: string
}

interface ChipSelectSingleProps {
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
  multi?: false
  className?: string
}

interface ChipSelectMultiProps {
  options: ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  multi: true
  className?: string
}

type ChipSelectProps = ChipSelectSingleProps | ChipSelectMultiProps

export function ChipSelect(props: ChipSelectProps) {
  const { options, multi, className } = props

  function isSelected(optionValue: string): boolean {
    if (multi) {
      return (props.value as string[]).includes(optionValue)
    }
    return (props.value as string) === optionValue
  }

  function handleClick(optionValue: string) {
    if (multi) {
      const current = props.value as string[]
      const onChange = props.onChange as (v: string[]) => void
      if (current.includes(optionValue)) {
        onChange(current.filter((v) => v !== optionValue))
      } else {
        onChange([...current, optionValue])
      }
    } else {
      const onChange = props.onChange as (v: string) => void
      onChange(optionValue)
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = isSelected(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleClick(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium",
              "border transition-all duration-150 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-brand-orange/30",
              selected && !multi &&
                "bg-brand-orange/10 border-brand-orange text-brand-orange",
              selected && multi &&
                "bg-emerald-50 border-emerald-500 text-emerald-700",
              !selected &&
                "border-card-border bg-white text-foreground hover:border-brand-orange/50 hover:bg-gray-50"
            )}
          >
            {selected && multi && (
              <Check className="h-3.5 w-3.5 shrink-0" />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
