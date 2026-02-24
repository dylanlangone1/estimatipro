"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { Search, ArrowUpDown } from "lucide-react"

interface MaterialEntry {
  id: string
  materialName: string
  category: string | null
  unit: string
  avgUnitPrice: number
  lastUnitPrice: number
  minUnitPrice: number
  maxUnitPrice: number
  priceCount: number
  bestSupplier: string | null
}

interface Props {
  materials: MaterialEntry[]
}

type SortField = "materialName" | "category" | "avgUnitPrice" | "lastUnitPrice" | "priceCount"

export function MaterialLibraryTable({ materials }: Props) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [sortField, setSortField] = useState<SortField>("materialName")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const categories = useMemo(() => {
    const cats = new Set<string>()
    materials.forEach((m) => {
      if (m.category) cats.add(m.category)
    })
    return Array.from(cats).sort()
  }, [materials])

  const filtered = useMemo(() => {
    let result = materials

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.materialName.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q) ||
          m.bestSupplier?.toLowerCase().includes(q)
      )
    }

    if (categoryFilter) {
      result = result.filter((m) => m.category === categoryFilter)
    }

    result.sort((a, b) => {
      let aVal: string | number = ""
      let bVal: string | number = ""

      switch (sortField) {
        case "materialName":
          aVal = a.materialName.toLowerCase()
          bVal = b.materialName.toLowerCase()
          break
        case "category":
          aVal = (a.category || "").toLowerCase()
          bVal = (b.category || "").toLowerCase()
          break
        case "avgUnitPrice":
          aVal = a.avgUnitPrice
          bVal = b.avgUnitPrice
          break
        case "lastUnitPrice":
          aVal = a.lastUnitPrice
          bVal = b.lastUnitPrice
          break
        case "priceCount":
          aVal = a.priceCount
          bVal = b.priceCount
          break
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [materials, search, categoryFilter, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-card-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted py-8">
          {search || categoryFilter ? "No materials match your filter." : "No materials tracked yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-left">
                <SortableHeader
                  label="Material"
                  field="materialName"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader
                  label="Category"
                  field="category"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader
                  label="Avg Price"
                  field="avgUnitPrice"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader
                  label="Last Price"
                  field="lastUnitPrice"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="py-2 px-3 text-muted font-medium">Unit</th>
                <SortableHeader
                  label="Data Pts"
                  field="priceCount"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="py-2 px-3 text-muted font-medium">Best Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{m.materialName}</td>
                  <td className="py-2.5 px-3 text-muted">{m.category || "—"}</td>
                  <td className="py-2.5 px-3 tabular-nums">{formatCurrency(m.avgUnitPrice)}</td>
                  <td className="py-2.5 px-3 tabular-nums">{formatCurrency(m.lastUnitPrice)}</td>
                  <td className="py-2.5 px-3 text-muted">{m.unit}</td>
                  <td className="py-2.5 px-3 text-center">{m.priceCount}</td>
                  <td className="py-2.5 px-3 text-muted">{m.bestSupplier || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-3">
        Showing {filtered.length} of {materials.length} materials
      </p>
    </div>
  )
}

function SortableHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string
  field: SortField
  current: SortField
  dir: "asc" | "desc"
  onSort: (field: SortField) => void
}) {
  return (
    <th className="py-2 px-3">
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 text-muted font-medium hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${current === field ? "text-brand-orange" : ""}`} />
        {current === field && (
          <span className="text-xs text-brand-orange">{dir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  )
}
