"use client"

import { formatCurrency } from "@/lib/utils"

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

export function LineItemTable({ lineItems, showLabor = true, isNew = false }: LineItemTableProps) {
  const grouped = groupByCategory(lineItems)
  const categories = Object.keys(grouped)

  // Compute startIndex offset for each category group (for stagger animation)
  let globalIndex = 0
  const categoryOffsets: Record<string, number> = {}
  for (const category of categories) {
    categoryOffsets[category] = globalIndex
    // +1 for category header, +items, +1 for subtotal
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
}: {
  category: string
  items: LineItem[]
  categoryTotal: number
  showLabor: boolean
  isNew: boolean
  startIndex: number
}) {
  return (
    <>
      {/* Category Header */}
      <tr
        className={`bg-gray-50 ${isNew ? "opacity-0 animate-fade-in-up" : ""}`}
        style={isNew ? { animationDelay: `${startIndex * 60}ms` } : undefined}
      >
        <td
          colSpan={showLabor ? 7 : 5}
          className="py-2.5 px-4 font-semibold text-brand-charcoal text-sm uppercase tracking-wide"
        >
          {category}
        </td>
      </tr>

      {/* Line Items */}
      {items.map((item, itemIndex) => (
        <tr
          key={item.id}
          className={`border-b border-card-border/50 hover:bg-gray-50/50 ${
            isNew ? "opacity-0 animate-fade-in-up" : ""
          }`}
          style={
            isNew
              ? { animationDelay: `${(startIndex + 1 + itemIndex) * 60}ms` }
              : undefined
          }
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
        </tr>
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
          colSpan={showLabor ? 6 : 4}
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
