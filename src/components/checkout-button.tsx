"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface CheckoutButtonProps {
  priceId: string
  variant?: "primary" | "outline" | "ghost" | "danger" | "secondary"
  size?: "sm" | "md" | "lg" | "icon"
  className?: string
  children: React.ReactNode
}

export function CheckoutButton({
  priceId,
  variant,
  size,
  className,
  children,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    // No priceId — send to register (env vars not set)
    if (!priceId) {
      window.location.href = "/register"
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      if (res.status === 401) {
        // Not logged in — send to login, return to pricing after
        window.location.href = "/login?callbackUrl=/pricing"
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        setLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Button
        variant={variant}
        size={size}
        className={`w-full ${className ?? ""}`}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Loading..." : children}
      </Button>
      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
