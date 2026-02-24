"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import { Wand2, Send } from "lucide-react"

interface EditBarProps {
  estimateId: string
  onEditStateChange?: (isEditing: boolean) => void
}

export function EditBar({ estimateId, onEditStateChange }: EditBarProps) {
  const router = useRouter()
  const { toast, dismissToast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // Notify parent of edit state changes
  useEffect(() => {
    onEditStateChange?.(isEditing)
  }, [isEditing, onEditStateChange])

  async function handleEdit() {
    if (!prompt.trim()) return

    setIsEditing(true)
    const loadingToastId = toast({
      title: "Applying changes...",
      variant: "info",
      persistent: true,
    })

    try {
      let res: Response
      try {
        res = await fetch("/api/ai/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimateId, prompt }),
        })
      } catch {
        throw new Error(
          "Network error — please check your internet connection and try again."
        )
      }

      if (!res.ok) {
        let errorMessage = "Failed to edit estimate"
        try {
          const data = await res.json()
          errorMessage = data.error || errorMessage
        } catch {
          if (res.status === 401) errorMessage = "Session expired. Please sign in again."
          else if (res.status === 404) errorMessage = "Estimate not found."
          else if (res.status >= 500) errorMessage = "Server error — please try again later."
        }
        throw new Error(errorMessage)
      }

      const data = await res.json()
      dismissToast(loadingToastId)
      toast({
        title: "Changes applied",
        description: data.changes?.[0]?.description || "Estimate updated successfully",
        variant: "success",
      })
      setPrompt("")
      router.refresh()
    } catch (err) {
      dismissToast(loadingToastId)
      toast({
        title: "Edit failed",
        description:
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "error",
      })
    } finally {
      setIsEditing(false)
    }
  }

  return (
    <div className="sticky bottom-0 bg-background border-t border-card-border shadow-lg z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Edit input */}
        <div className="flex items-center gap-3">
          <Wand2 className="h-5 w-5 text-brand-orange shrink-0" />
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isEditing) {
                  e.preventDefault()
                  handleEdit()
                }
              }}
              placeholder='Edit this estimate... (e.g., "Swap hardwood for LVP" or "Add 10% to all labor costs")'
              className="w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              disabled={isEditing}
            />
          </div>
          <Button
            onClick={handleEdit}
            disabled={isEditing || !prompt.trim()}
            size="sm"
          >
            {isEditing ? (
              <>
                <Spinner size="sm" className="mr-1.5 text-white" />
                Editing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Apply
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
