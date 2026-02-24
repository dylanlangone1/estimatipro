"use client"

import { useState, useEffect } from "react"
import { X, Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "estimai-pwa-dismiss"
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone)
  )
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(true) // Start hidden until we check

  // Check if prompt was recently dismissed
  useEffect(() => {
    if (isStandalone()) return // Already installed

    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < DISMISS_DURATION_MS) {
      return // Recently dismissed
    }

    setDismissed(false)

    // Listen for the Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Show iOS-specific prompt after short delay
    if (isIOS()) {
      const timer = setTimeout(() => setShowIOSPrompt(true), 2000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener("beforeinstallprompt", handler)
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIOSPrompt(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
    }
    handleDismiss()
  }

  // Nothing to show
  if (dismissed || (!deferredPrompt && !showIOSPrompt)) return null

  return (
    <div className="mx-4 sm:mx-0 mb-4 bg-gradient-to-r from-brand-orange/10 to-brand-orange/5 border border-brand-orange/20 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center">
        <Download className="h-5 w-5 text-brand-orange" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Install EstimAI Pro</p>
        {showIOSPrompt ? (
          <p className="text-xs text-muted mt-0.5">
            Tap <Share className="h-3 w-3 inline-block mx-0.5" /> then &quot;Add to Home Screen&quot;
          </p>
        ) : (
          <p className="text-xs text-muted mt-0.5">
            Quick access from your home screen — works offline
          </p>
        )}
      </div>

      {deferredPrompt && (
        <Button size="sm" onClick={handleInstall} className="shrink-0">
          Install
        </Button>
      )}

      <button
        onClick={handleDismiss}
        className="p-1 text-muted hover:text-foreground transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
