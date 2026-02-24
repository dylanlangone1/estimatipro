"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          <AlertTriangle className="h-12 w-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted mb-6">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <Button onClick={reset} size="lg">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
