"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react"

type ToastVariant = "success" | "error" | "info" | "warning"

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  persistent?: boolean
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
  exiting?: boolean
}

interface ToastContextType {
  toast: (options: ToastOptions) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

const variantConfig: Record<
  ToastVariant,
  { borderColor: string; icon: typeof CheckCircle; iconColor: string }
> = {
  success: {
    borderColor: "border-l-success",
    icon: CheckCircle,
    iconColor: "text-success",
  },
  error: {
    borderColor: "border-l-error",
    icon: XCircle,
    iconColor: "text-error",
  },
  info: {
    borderColor: "border-l-info",
    icon: Info,
    iconColor: "text-info",
  },
  warning: {
    borderColor: "border-l-warning",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  const dismissToast = useCallback((id: string) => {
    // Clear any existing timer
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    // Start exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    )

    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  const toast = useCallback(
    (options: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const newToast: ToastItem = {
        ...options,
        id,
        variant: options.variant || "info",
      }

      setToasts((prev) => {
        // Keep max 3 toasts — dismiss oldest if needed
        const updated = [...prev, newToast]
        if (updated.length > 3) {
          const oldest = updated[0]
          dismissToast(oldest.id)
        }
        return updated
      })

      // Auto-dismiss unless persistent
      if (!options.persistent) {
        const duration = options.duration || 4000
        const timer = setTimeout(() => {
          dismissToast(id)
        }, duration)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [dismissToast]
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => {
            const config = variantConfig[t.variant || "info"]
            const Icon = config.icon

            return (
              <div
                key={t.id}
                className={`
                  pointer-events-auto bg-card rounded-xl shadow-lg border border-card-border
                  border-l-4 ${config.borderColor} px-4 py-3
                  ${t.exiting ? "animate-slide-out-right" : "animate-slide-in-right"}
                `}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className={`h-5 w-5 ${config.iconColor} shrink-0 mt-0.5`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => dismissToast(t.id)}
                    className="text-muted hover:text-foreground shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}
