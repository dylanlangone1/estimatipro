"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import {
  Sparkles,
  X,
  Send,
  BarChart3,
  TrendingUp,
  AlertCircle,
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface AIWizardProps {
  estimateId: string
}

const QUICK_ACTIONS = [
  { label: "Review my estimate", icon: BarChart3, prompt: "Review my estimate and tell me if anything looks off — pricing, missing items, or areas I should double-check." },
  { label: "Is my markup right?", icon: TrendingUp, prompt: "Is my markup percentage reasonable for this type of project? What would you recommend?" },
  { label: "What am I missing?", icon: AlertCircle, prompt: "What common items or costs might I be missing from this estimate that I should consider adding?" },
]

export function AIWizard({ estimateId }: AIWizardProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  async function sendMessage(question: string) {
    if (!question.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: question.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/ai/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId, question: question.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to get advice")
      }

      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }])
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong"
      if (errMsg.includes("Standard plan")) {
        toast({
          title: "Upgrade required",
          description: "AI Wizard is available on Standard plans and above.",
          variant: "warning",
        })
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Sorry, I couldn't process that request. ${errMsg}` },
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-28 right-4 sm:right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-brand-orange text-white rounded-full shadow-lg hover:bg-brand-orange/90 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI Advisor</span>
        </button>
      )}

      {/* Slide-out panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-4 left-4 sm:left-auto sm:right-6 z-40 sm:w-96 max-h-[70vh] bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-card">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-orange" />
              <span className="font-semibold text-foreground text-sm">AI Advisor</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-card-border/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[45vh]">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted text-center py-2">
                  Ask me anything about this estimate
                </p>
                {/* Quick actions */}
                <div className="space-y-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      disabled={isLoading}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground bg-background border border-card-border rounded-lg hover:bg-card-border/20 transition-colors text-left disabled:opacity-50"
                    >
                      <action.icon className="h-4 w-4 text-brand-orange shrink-0" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm ${
                  msg.role === "user"
                    ? "ml-8 bg-brand-orange/10 text-foreground rounded-2xl rounded-br-md px-3 py-2"
                    : "mr-4 text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="bg-background border border-card-border rounded-2xl rounded-bl-md px-3 py-2 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}

            {isLoading && (
              <div className="mr-4">
                <div className="bg-background border border-card-border rounded-2xl rounded-bl-md px-3 py-2 inline-flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-card-border">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about pricing, scope, markup..."
                className="flex-1 text-sm bg-background border border-card-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/30 max-h-20"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
