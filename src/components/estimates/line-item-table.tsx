"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"
import { Pencil, Check, X } from "lucide-react"

interface LineItem {
  id: string
  category: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  laborCost?: number | null
  materialCost?: number | null
  markupPercent?: number | null
  sortOrder: number
}

interface LineItemTableProps {
  lineItems: LineItem[]
  showLabor?: boolean
  isNew?: boolean
  editable?: boolean
  estimateId?: string
}

function groupByCategory(items: LineItem[]): Record<string, LineItem[]> {
  const groups: Record<string, LineItem[]> = {}
  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = []
    }
    groups[item.category].push(item)
  }
  return groups
}

export function LineItemTable({
  lineItems,
  showLabor = true,
  isNew = false,
  editable = false,
  estimateId,
}: LineItemTableProps) {
  const grouped = groupByCategory(lineItems)
  const categories = Object.keys(grouped)

  // Compute startIndex offset for each category group (for stagger animation)
  let globalIndex = 0
  const categoryOffsets: Record<string, number> = {}
  for (const category of categories) {
    categoryOffsets[category] = globalIndex
    globalIndex += 1 + grouped[category].length + 1
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border text-left">
            <th className="py-3 px-4 font-semibold text-foreground">Description</th>
            <th className="py-3 px-2 font-semibold text-foreground text-right w-20">Qty</th>
            <th className="py-3 px-2 font-semibold text-foreground text-center w-16">Unit</th>
            <th className="py-3 px-2 font-semibold text-foreground text-right w-28">Unit Cost</th>
            {showLabor && (
              <>
                <th className="py-3 px-2 font-semibold text-foreground text-right w-28 hidden sm:table-cell">Labor</th>
                <th className="py-3 px-2 font-semibold text-foreground text-right w-28 hidden sm:table-cell">Material</th>
              </>
            )}
            <th className="py-3 px-4 font-semibold text-foreground text-right w-32">Total</th>
            {editable && <th className="py-3 px-2 w-10" />}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const items = grouped[category]
            const categoryTotal = items.reduce((sum, item) => sum + item.totalCost, 0)

            return (
              <CategoryGroup
                key={category}
                category={category}
                items={items}
                categoryTotal={categoryTotal}
                showLabor={showLabor}
                isNew={isNew}
                startIndex={categoryOffsets[category]}
                editable={editable}
                estimateId={estimateId}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CategoryGroup({
  category,
  items,
  categoryTotal,
  showLabor,
  isNew,
  startIndex,
  editable,
  estimateId,
}: {
  category: string
  items: LineItem[]
  categoryTotal: number
  showLabor: boolean
  isNew: boolean
  startIndex: number
  editable?: boolean
  estimateId?: string
}) {
  return (
    <>
      {/* Category Header */}
      <tr
        className={`bg-gray-50 ${isNew ? "opacity-0 animate-fade-in-up" : ""}`}
        style={isNew ? { animationDelay: `${startIndex * 60}ms` } : undefined}
      >
        <td
          colSpan={showLabor ? (editable ? 8 : 7) : (editable ? 6 : 5)}
          className="py-2.5 px-4 font-semibold text-brand-charcoal text-sm uppercase tracking-wide"
        >
          {category}
        </td>
      </tr>

      {/* Line Items */}
      {items.map((item, itemIndex) => (
        <EditableLineItemRow
          key={item.id}
          item={item}
          showLabor={showLabor}
          isNew={isNew}
          animDelay={(startIndex + 1 + itemIndex) * 60}
          editable={editable}
          estimateId={estimateId}
        />
      ))}

      {/* Category Subtotal */}
      <tr
        className={`border-b border-card-border ${
          isNew ? "opacity-0 animate-fade-in-up" : ""
        }`}
        style={
          isNew
            ? { animationDelay: `${(startIndex + 1 + items.length) * 60}ms` }
            : undefined
        }
      >
        <td
          colSpan={showLabor ? (editable ? 7 : 6) : (editable ? 5 : 4)}
          className="py-2 px-4 text-right text-sm font-medium text-muted"
        >
          {category} Subtotal
        </td>
        <td className="py-2 px-4 text-right font-semibold text-foreground tabular-nums">
          {formatCurrency(categoryTotal)}
        </td>
      </tr>
    </>
  )
}

function EditableLineItemRow({
  item,
  showLabor,
  isNew,
  animDelay,
  editable,
  estimateId,
}: {
  item: LineItem
  showLabor: boolean
  isNew: boolean
  animDelay: number
  editable?: boolean
  estimateId?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editDesc, setEditDesc] = useState(item.description)
  const [editQty, setEditQty] = useState(String(item.quantity))
  const [editUnitCost, setEditUnitCost] = useState(String(item.unitCost))
  const [isSaving, setIsSaving] = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

  const enterEdit = useCallback(() => {
    setEditDesc(item.description)
    setEditQty(String(item.quantity))
    setEditUnitCost(String(item.unitCost))
    setIsEditMode(true)
    setTimeout(() => descRef.current?.focus(), 50)
  }, [item])

  const cancelEdit = useCallback(() => {
    setIsEditMode(false)
    setEditDesc(item.description)
    setEditQty(String(item.quantity))
    setEditUnitCost(String(item.unitCost))
  }, [item])

  const saveEdit = useCallback(async () => {
    if (!estimateId) return
    const qty = parseFloat(editQty)
    const cost = parseFloat(editUnitCost)

    if (isNaN(qty) || qty < 0 || isNaN(cost) || cost < 0) {
      toast({ title: "Invalid values", description: "Quantity and cost must be valid numbers.", variant: "error" })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems: [{
            id: item.id,
            description: editDesc.trim(),
            quantity: qty,
            unitCost: cost,
          }],
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setIsEditMode(false)
      toast({ title: "Line item updated", variant: "success" })
      router.refresh()
    } catch {
      toast({ title: "Failed to save", variant: "error" })
    } finally {
      setIsSaving(false)
    }
  }, [estimateId, item.id, editDesc, editQty, editUnitCost, toast, router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === "Escape") {
      cancelEdit()
    }
  }, [saveEdit, cancelEdit])

  if (isEditMode) {
    return (
      <tr className="border-b border-card-border/50 bg-brand-orange/5">
        <td className="py-1.5 px-2">
          <input
            ref={descRef}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-sm bg-background border border-card-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-orange"
            disabled={isSaving}
          />
        </td>
        <td className="py-1.5 px-1">
          <input
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            onKeyDown={handleKeyDown}
            type="number"
            step="any"
            min="0"
            className="w-full text-sm bg-background border border-card-border rounded px-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-brand-orange tabular-nums"
            disabled={isSaving}
          />
        </td>
        <td className="py-1.5 px-2 text-center text-muted text-sm">{item.unit}</td>
        <td className="py-1.5 px-1">
          <input
            value={editUnitCost}
            onChange={(e) => setEditUnitCost(e.target.value)}
            onKeyDown={handleKeyDown}
            type="number"
            step="0.01"
            min="0"
            className="w-full text-sm bg-background border border-card-border rounded px-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-brand-orange tabular-nums"
            disabled={isSaving}
          />
        </td>
        {showLabor && (
          <>
            <td className="py-1.5 px-2 text-right text-muted tabular-nums hidden sm:table-cell text-sm">
              {item.laborCost ? formatCurrency(item.laborCost) : "\u2014"}
            </td>
            <td className="py-1.5 px-2 text-right text-muted tabular-nums hidden sm:table-cell text-sm">
              {item.materialCost ? formatCurrency(item.materialCost) : "\u2014"}
            </td>
          </>
        )}
        <td className="py-1.5 px-2 text-right font-medium text-muted tabular-nums text-sm">
          {formatCurrency(parseFloat(editQty || "0") * parseFloat(editUnitCost || "0"))}
        </td>
        <td className="py-1.5 px-1">
          <div className="flex items-center gap-0.5">
            <button
              onClick={saveEdit}
              disabled={isSaving}
              className="p-1 text-success hover:text-success/80 transition-colors"
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1 text-muted hover:text-foreground transition-colors"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr
      className={`border-b border-card-border/50 hover:bg-gray-50/50 group ${
        isNew ? "opacity-0 animate-fade-in-up" : ""
      }`}
      style={isNew ? { animationDelay: `${animDelay}ms` } : undefined}
    >
      <td className="py-2.5 px-4 text-foreground">{item.description}</td>
      <td className="py-2.5 px-2 text-right text-foreground tabular-nums">
        {item.quantity.toLocaleString()}
      </td>
      <td className="py-2.5 px-2 text-center text-muted">{item.unit}</td>
      <td className="py-2.5 px-2 text-right text-foreground tabular-nums">
        {formatCurrency(item.unitCost)}
      </td>
      {showLabor && (
        <>
          <td className="py-2.5 px-2 text-right text-muted tabular-nums hidden sm:table-cell">
            {item.laborCost ? formatCurrency(item.laborCost) : "\u2014"}
          </td>
          <td className="py-2.5 px-2 text-right text-muted tabular-nums hidden sm:table-cell">
            {item.materialCost ? formatCurrency(item.materialCost) : "\u2014"}
          </td>
        </>
      )}
      <td className="py-2.5 px-4 text-right font-medium text-foreground tabular-nums">
        {formatCurrency(item.totalCost)}
      </td>
      {editable && (
        <td className="py-2.5 px-2">
          <button
            onClick={enterEdit}
            className="p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-brand-orange transition-all"
            title="Edit line item"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </tr>
  )
}
