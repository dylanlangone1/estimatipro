"use client"

import { useState, useEffect, useRef } from "react"
import { formatCurrency } from "@/lib/utils"

interface AnimatedCurrencyProps {
  value: number
  duration?: number
  delay?: number
  className?: string
}

export function AnimatedCurrency({
  value,
  duration = 1200,
  delay = 0,
  className,
}: AnimatedCurrencyProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [started, setStarted] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0)
      return
    }

    const delayTimer = setTimeout(() => {
      setStarted(true)
      const startTime = performance.now()

      function animate(currentTime: number) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(eased * value)

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setDisplayValue(value)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(delayTimer)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, duration, delay])

  if (!started && delay > 0) {
    return <span className={className}>{formatCurrency(0)}</span>
  }

  return <span className={className}>{formatCurrency(displayValue)}</span>
}
