"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RotateCw } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error.message)
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="bg-card border border-card-border rounded-xl p-8 max-w-md w-full text-center shadow-sm">
            <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-muted mb-6">
              An unexpected error occurred. This has been logged automatically.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange/90 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              Reload Page
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-4 text-left text-xs text-error bg-error/5 rounded p-3 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
