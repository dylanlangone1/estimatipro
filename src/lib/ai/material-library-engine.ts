import { prisma } from "@/lib/prisma"

/**
 * After parsing a supplier invoice, upsert each item into the MaterialPriceLibrary.
 * Recalculates avg/min/max/last prices and appends to priceHistory.
 */
export async function updateMaterialLibrary(userId: string, invoiceId: string) {
  // Fetch all items from the parsed invoice
  const items = await prisma.supplierItem.findMany({
    where: { supplierInvoiceId: invoiceId },
    include: {
      supplierInvoice: {
        select: { supplierName: true, createdAt: true },
      },
    },
  })

  if (items.length === 0) return

  for (const item of items) {
    const materialName = item.normalizedName || item.itemDescription
    const unit = item.normalizedUnit || item.unit
    const unitPrice = item.normalizedUnitPrice || item.unitPrice
    const supplier = item.supplierInvoice.supplierName || "Unknown"

    // Try to find existing entry
    const existing = await prisma.materialPriceLibrary.findFirst({
      where: {
        userId,
        materialName,
      },
    })

    if (existing) {
      // Update existing entry
      const history = Array.isArray(existing.priceHistory) ? existing.priceHistory as Array<{ price: number; date: string; supplier: string }> : []
      history.push({
        price: unitPrice,
        date: item.supplierInvoice.createdAt.toISOString(),
        supplier,
      })

      const allPrices = history.map((h) => h.price)
      const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length

      await prisma.materialPriceLibrary.update({
        where: {
          userId_materialName: {
            userId,
            materialName,
          },
        },
        data: {
          category: item.category || existing.category,
          unit,
          avgUnitPrice: Math.round(avg * 100) / 100,
          lastUnitPrice: unitPrice,
          minUnitPrice: Math.min(existing.minUnitPrice, unitPrice),
          maxUnitPrice: Math.max(existing.maxUnitPrice, unitPrice),
          priceCount: existing.priceCount + 1,
          priceHistory: JSON.parse(JSON.stringify(history)),
          bestSupplier: findBestSupplier(history),
        },
      })
    } else {
      // Create new entry
      const history = [
        {
          price: unitPrice,
          date: item.supplierInvoice.createdAt.toISOString(),
          supplier,
        },
      ]

      await prisma.materialPriceLibrary.create({
        data: {
          userId,
          materialName,
          category: item.category || "Other",
          unit,
          avgUnitPrice: unitPrice,
          lastUnitPrice: unitPrice,
          minUnitPrice: unitPrice,
          maxUnitPrice: unitPrice,
          priceCount: 1,
          priceHistory: JSON.parse(JSON.stringify(history)),
          bestSupplier: supplier,
        },
      })
    }
  }
}

/**
 * Find the supplier with the lowest average price from the history.
 */
function findBestSupplier(history: Array<{ price: number; supplier: string }>): string {
  const supplierTotals: Record<string, { total: number; count: number }> = {}

  for (const entry of history) {
    if (!supplierTotals[entry.supplier]) {
      supplierTotals[entry.supplier] = { total: 0, count: 0 }
    }
    supplierTotals[entry.supplier].total += entry.price
    supplierTotals[entry.supplier].count += 1
  }

  let bestSupplier = "Unknown"
  let bestAvg = Infinity

  for (const [supplier, data] of Object.entries(supplierTotals)) {
    const avg = data.total / data.count
    if (avg < bestAvg) {
      bestAvg = avg
      bestSupplier = supplier
    }
  }

  return bestSupplier
}
