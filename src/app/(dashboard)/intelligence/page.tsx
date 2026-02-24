import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  Brain,
  Upload,
  TrendingUp,
  BarChart3,
  FileText,
  Package,
  Store,
} from "lucide-react"
import Link from "next/link"
import { MaterialLibraryTable } from "@/components/intelligence/material-library-table"

interface CategoryPattern {
  avgMarkup: number | null
  avgUnitCost: number | null
  avgLaborRate: number | null
  sampleSize: number
  confidence: number
  items: Array<{
    description: string
    avgUnitCost: number
    unit: string
    count: number
  }>
}

export default async function IntelligencePage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [profile, materials, invoiceAgg, estimateCount, docCount] = await Promise.all([
    prisma.pricingProfile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.materialPriceLibrary.findMany({
      where: { userId: session.user.id },
      orderBy: { priceCount: "desc" },
    }),
    prisma.supplierInvoice.aggregate({
      where: { userId: session.user.id },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.estimate.count({ where: { userId: session.user.id } }),
    prisma.uploadedDocument.count({ where: { userId: session.user.id } }),
  ])

  // Calculate DNA strength from multiple data sources
  const totalDataPoints =
    (profile?.totalEstimatesAnalyzed || 0) +
    (profile?.totalDocumentsProcessed || 0) +
    materials.length +
    (invoiceAgg._count || 0)
  const dnaStrength = Math.min(Math.round((totalDataPoints / 150) * 100), 100)

  const categories = (profile?.categoryPatterns as Record<string, CategoryPattern> | null) ?? {}
  const categoryList = Object.entries(categories).sort((a, b) => b[1].sampleSize - a[1].sampleSize)

  // Aggregate top suppliers from invoices
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where: { userId: session.user.id },
    select: {
      supplierName: true,
      totalAmount: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const supplierMap: Record<string, { totalSpent: number; invoiceCount: number; itemCount: number }> = {}
  for (const inv of supplierInvoices) {
    const name = inv.supplierName || "Unknown"
    if (!supplierMap[name]) {
      supplierMap[name] = { totalSpent: 0, invoiceCount: 0, itemCount: 0 }
    }
    supplierMap[name].totalSpent += inv.totalAmount || 0
    supplierMap[name].invoiceCount += 1
    supplierMap[name].itemCount += inv._count.items
  }
  const topSuppliers = Object.entries(supplierMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)

  // Empty state
  if (!profile && materials.length === 0 && invoiceAgg._count === 0 && estimateCount === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intelligence Center</h1>
          <p className="text-muted mt-1">Your AI&apos;s pricing brain — powered by everything you upload.</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-16 w-16 text-muted mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No Intelligence Data Yet</h2>
            <p className="text-muted mb-6 max-w-md mx-auto">
              Upload past estimates and supplier invoices to start building your AI&apos;s pricing intelligence.
              The more you feed it, the smarter your estimates get.
            </p>
            <Link href="/upload">
              <Button>
                <Upload className="h-4 w-4 mr-1.5" />
                Start Uploading
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Intelligence Center</h1>
        <p className="text-muted mt-1">Your AI&apos;s pricing brain — powered by everything you upload.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-orange" />
              <div>
                <p className="text-2xl font-bold text-foreground">{estimateCount}</p>
                <p className="text-sm text-muted">Estimates Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-brand-blue" />
              <div>
                <p className="text-2xl font-bold text-foreground">{invoiceAgg._count || 0}</p>
                <p className="text-sm text-muted">Supplier Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">{materials.length}</p>
                <p className="text-sm text-muted">Materials Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-brand-orange" />
              <div>
                <p className="text-2xl font-bold text-foreground">{dnaStrength}%</p>
                <p className="text-sm text-muted">DNA Strength</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DNA Strength Meter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Intelligence Strength</span>
            <span className="text-sm text-muted">{totalDataPoints} data points</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-orange to-brand-blue rounded-full transition-all duration-500"
              style={{ width: `${dnaStrength}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {dnaStrength < 20
              ? "Just getting started. Upload estimates, supplier invoices, and receipts to train your AI."
              : dnaStrength < 50
                ? "Building momentum! Keep uploading — supplier invoices are especially valuable for accurate material pricing."
                : dnaStrength < 80
                  ? "Strong intelligence base. Your estimates are getting significantly more accurate."
                  : "Expert-level intelligence! Your AI has deep knowledge of your pricing patterns."}
          </p>
        </CardContent>
      </Card>

      {/* Average Costs by Category */}
      {categoryList.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-orange" />
              <h2 className="font-semibold text-foreground">Average Costs by Category</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-card-border">
              {categoryList.map(([name, pattern]) => (
                <div key={name} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-foreground">{name}</h3>
                    <Badge variant="outline">{pattern.sampleSize} items</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Avg Markup</span>
                      <p className="font-medium text-foreground">
                        {pattern.avgMarkup ? `${pattern.avgMarkup.toFixed(1)}%` : "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted">Avg Unit Cost</span>
                      <p className="font-medium text-foreground">
                        {pattern.avgUnitCost ? formatCurrency(pattern.avgUnitCost) : "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted">Avg Labor Rate</span>
                      <p className="font-medium text-foreground">
                        {pattern.avgLaborRate ? `${formatCurrency(pattern.avgLaborRate)}/hr` : "--"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-blue rounded-full"
                        style={{ width: `${pattern.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material Price Library */}
      {materials.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-success" />
              <h2 className="font-semibold text-foreground">Material Price Library</h2>
            </div>
            <p className="text-sm text-muted">
              Real prices from your supplier invoices — used to generate more accurate estimates.
            </p>
          </CardHeader>
          <CardContent>
            <MaterialLibraryTable
              materials={materials.map((m) => ({
                id: m.id,
                materialName: m.materialName,
                category: m.category,
                unit: m.unit,
                avgUnitPrice: m.avgUnitPrice,
                lastUnitPrice: m.lastUnitPrice,
                minUnitPrice: m.minUnitPrice,
                maxUnitPrice: m.maxUnitPrice,
                priceCount: m.priceCount,
                bestSupplier: m.bestSupplier,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Top Suppliers */}
      {topSuppliers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-brand-blue" />
              <h2 className="font-semibold text-foreground">Top Suppliers</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-card-border">
              {topSuppliers.map((supplier) => (
                <div key={supplier.name} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="font-medium text-foreground">{supplier.name}</p>
                    <p className="text-sm text-muted">
                      {supplier.invoiceCount} invoice{supplier.invoiceCount !== 1 ? "s" : ""} &middot;{" "}
                      {supplier.itemCount} items
                    </p>
                  </div>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(supplier.totalSpent)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload CTA */}
      <Card className="border-dashed border-2 border-card-border">
        <CardContent className="py-8 text-center">
          <TrendingUp className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-muted mb-4">
            Upload more estimates and supplier invoices to strengthen your AI&apos;s intelligence.
          </p>
          <Link href="/upload">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-1.5" />
              Upload Documents
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
