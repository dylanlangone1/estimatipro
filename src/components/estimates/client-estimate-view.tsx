"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  FileText,
  Pencil,
  Check,
  X,
  Download,
  Sparkles,
} from "lucide-react"
import type { CategoryNarrative } from "@/types/proposal"
import type { JsonValue } from "@prisma/client/runtime/client"

interface LineItem {
  id: string
  category: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  laborCost: number | null
  materialCost: number | null
  markupPercent: number | null
  sortOrder: number
}

interface ClientEstimateViewProps {
  estimateId: string
  title: string
  description: string
  projectType: string | null
  createdAt: Date
  clientName: string | null
  lineItems: LineItem[]
  subtotal: number
  taxAmount: number
  markupPercent: number
  markupAmount: number
  totalAmount: number
  proposalData: JsonValue | null
}

export function ClientEstimateView({
  estimateId,
  title,
  description,
  projectType,
  createdAt,
  clientName,
  lineItems,
  subtotal,
  taxAmount,
  markupPercent,
  markupAmount,
  totalAmount,
}: ClientEstimateViewProps) {
  const { toast } = useToast()
  const [narratives, setNarratives] = useState<CategoryNarrative[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // Group line items by category with totals
  const categories = useMemo(() => {
    const groups: Record<string, { items: LineItem[]; rawTotal: number }> = {}
    for (const item of lineItems) {
      if (!groups[item.category]) groups[item.category] = { items: [], rawTotal: 0 }
      groups[item.category].items.push(item)
      groups[item.category].rawTotal += item.totalCost
    }

    const multiplier = 1 + markupPercent / 100
    return Object.entries(groups).map(([category, data]) => ({
      category,
      itemCount: data.items.length,
      rawTotal: data.rawTotal,
      clientTotal: data.rawTotal * multiplier,
      narrative: narratives.find((n) => n.category === category)?.narrative || "",
    }))
  }, [lineItems, markupPercent, narratives])

  // Client-facing totals (markup baked in)
  const clientSubtotal = subtotal + markupAmount
  const clientTotal = totalAmount

  // Load narratives on mount
  useEffect(() => {
    async function loadNarratives() {
      try {
        const res = await fetch("/api/ai/category-narratives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimateId }),
        })
        if (!res.ok) throw new Error("Failed to load")
        const data = await res.json()
        setNarratives(data.categoryNarratives || [])
      } catch (err) {
        console.error("Failed to load narratives:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadNarratives()
  }, [estimateId])

  async function handleSaveNarrative(category: string) {
    // Upsert — update existing or add new narrative entry
    const updated = narratives.some((n) => n.category === category)
      ? narratives.map((n) => n.category === category ? { ...n, narrative: editText } : n)
      : [...narratives, { category, narrative: editText }]
    setNarratives(updated)
    setEditingCategory(null)

    try {
      await fetch("/api/ai/category-narratives", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId, categoryNarratives: updated }),
      })
    } catch {
      toast({ title: "Failed to save", variant: "error" })
    }
  }

  function handleExportPDF() {
    window.open(`/api/pdf/${estimateId}?type=client`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted">Preparing client estimate...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted">
                {projectType && (
                  <span className="capitalize">{projectType.replace(/_/g, " ")}</span>
                )}
                <span>{formatDate(createdAt)}</span>
                {clientName && <span>Prepared for: <strong className="text-foreground">{clientName}</strong></span>}
              </div>
            </div>
            <Button onClick={handleExportPDF} size="sm">
              <Download className="h-4 w-4 mr-1.5" />
              Export Client PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Description */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-orange" />
            <h3 className="font-semibold text-foreground">Project Overview</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {description.split("\n\nPROJECT LOCATION:")[0].split("\n\nPERMIT NOTE:")[0]}
          </p>
        </CardContent>
      </Card>

      {/* Scope of Work — Category Summaries with Narratives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-orange" />
              <h3 className="font-semibold text-foreground">Scope of Work</h3>
            </div>
            <span className="text-xs text-muted">{categories.length} categories</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {categories.map((cat, i) => (
            <div
              key={cat.category}
              className={`px-4 sm:px-6 py-4 ${i < categories.length - 1 ? "border-b border-card-border" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{cat.category}</h4>
                  {editingCategory === cat.category ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full text-sm bg-background border border-card-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNarrative(cat.category)}
                        >
                          <Check className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory(null)}
                        >
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted mt-1 leading-relaxed">
                      {cat.narrative || (
                        <span className="italic">No description yet</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingCategory !== cat.category && (
                    <button
                      onClick={() => {
                        setEditingCategory(cat.category)
                        setEditText(cat.narrative)
                      }}
                      className="p-1 text-muted hover:text-foreground transition-colors"
                      title="Edit description"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                    {formatCurrency(cat.clientTotal)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground">Investment Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md ml-auto">
            {categories.map((cat) => (
              <div key={cat.category} className="flex justify-between text-sm">
                <span className="text-muted">{cat.category}</span>
                <span className="text-foreground tabular-nums font-medium">
                  {formatCurrency(cat.clientTotal)}
                </span>
              </div>
            ))}
            <div className="border-t border-card-border my-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-foreground font-medium tabular-nums">
                {formatCurrency(clientSubtotal)}
              </span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tax</span>
                <span className="text-foreground tabular-nums">
                  {formatCurrency(taxAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-card-border">
              <span className="font-semibold text-foreground">Total Investment</span>
              <span className="text-xl font-bold text-brand-orange tabular-nums">
                {formatCurrency(clientTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export CTA */}
      <div className="flex justify-center">
        <Button onClick={handleExportPDF} className="px-8">
          <Download className="h-4 w-4 mr-2" />
          Download Client-Ready PDF
        </Button>
      </div>
    </div>
  )
}
