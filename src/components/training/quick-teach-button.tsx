"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Brain, X } from "lucide-react"
import { QuickTeachForm } from "./quick-teach-form"

export function QuickTeachButton({ estimateId }: { estimateId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <>
            <X className="h-4 w-4 mr-1.5" />
            Close
          </>
        ) : (
          <>
            <Brain className="h-4 w-4 mr-1.5" />
            Teach AI
          </>
        )}
      </Button>

      {isOpen && (
        <div className="mt-3 p-4 rounded-lg border border-card-border bg-card">
          <p className="text-sm text-muted mb-3">
            Teach the AI a rule based on this estimate:
          </p>
          <QuickTeachForm estimateId={estimateId} compact />
        </div>
      )}
    </div>
  )
}
