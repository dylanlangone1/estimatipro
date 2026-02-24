import { prisma } from "@/lib/prisma"

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

function average(arr: number[]): number | null {
  if (arr.length === 0) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export async function recalculatePricingDNA(userId: string) {
  // Get all parsed documents
  const docs = await prisma.uploadedDocument.findMany({
    where: { userId, parseStatus: "COMPLETED" },
  })

  // Get all estimates with line items
  const estimates = await prisma.estimate.findMany({
    where: { userId },
    include: { lineItems: true },
  })

  const categoryData: Record<
    string,
    { markups: number[]; unitCosts: number[]; laborRates: number[]; count: number; items: Record<string, { costs: number[]; unit: string }> }
  > = {}

  // Process uploaded documents
  for (const doc of docs) {
    const items = (doc.extractedLineItems as Array<Record<string, unknown>>) || []
    for (const item of items) {
      const cat = (item.category as string) || "Other"
      if (!categoryData[cat]) {
        categoryData[cat] = { markups: [], unitCosts: [], laborRates: [], count: 0, items: {} }
      }
      const d = categoryData[cat]
      if (typeof item.markupPercent === "number") d.markups.push(item.markupPercent)
      if (typeof item.unitCost === "number") d.unitCosts.push(item.unitCost)
      if (typeof item.laborCost === "number" && typeof item.quantity === "number" && (item.quantity as number) > 0) {
        d.laborRates.push((item.laborCost as number) / (item.quantity as number))
      }
      d.count++
      const desc = (item.description as string) || "Unknown"
      if (!d.items[desc]) d.items[desc] = { costs: [], unit: (item.unit as string) || "EA" }
      if (typeof item.unitCost === "number") d.items[desc].costs.push(item.unitCost)
    }
  }

  // Process estimates
  for (const est of estimates) {
    for (const item of est.lineItems) {
      if (!categoryData[item.category]) {
        categoryData[item.category] = { markups: [], unitCosts: [], laborRates: [], count: 0, items: {} }
      }
      const d = categoryData[item.category]
      if (item.markupPercent) d.markups.push(item.markupPercent)
      if (item.unitCost) d.unitCosts.push(item.unitCost)
      d.count++
      if (!d.items[item.description]) d.items[item.description] = { costs: [], unit: item.unit }
      d.items[item.description].costs.push(item.unitCost)
    }
  }

  // Process material library data (third source)
  const materialLibrary = await prisma.materialPriceLibrary.findMany({
    where: { userId },
  })

  for (const material of materialLibrary) {
    const cat = material.category || "Materials"
    if (!categoryData[cat]) {
      categoryData[cat] = { markups: [], unitCosts: [], laborRates: [], count: 0, items: {} }
    }
    const d = categoryData[cat]
    d.unitCosts.push(material.avgUnitPrice)
    d.count += material.priceCount
    if (!d.items[material.materialName]) {
      d.items[material.materialName] = { costs: [], unit: material.unit }
    }
    d.items[material.materialName].costs.push(material.avgUnitPrice)
  }

  // Get supplier invoice count
  const invoiceCount = await prisma.supplierInvoice.count({ where: { userId } })

  // Build patterns
  const categoryPatterns: Record<string, CategoryPattern> = {}
  for (const [cat, data] of Object.entries(categoryData)) {
    categoryPatterns[cat] = {
      avgMarkup: average(data.markups),
      avgUnitCost: average(data.unitCosts),
      avgLaborRate: average(data.laborRates),
      sampleSize: data.count,
      confidence: Math.min(data.count / 20, 1.0),
      items: Object.entries(data.items).map(([desc, info]) => ({
        description: desc,
        avgUnitCost: average(info.costs) || 0,
        unit: info.unit,
        count: info.costs.length,
      })),
    }
  }

  // Compute overall stats
  const allMarkups = Object.values(categoryData).flatMap((d) => d.markups)
  const allLaborRates = Object.values(categoryData).flatMap((d) => d.laborRates)

  await prisma.pricingProfile.upsert({
    where: { userId },
    create: {
      userId,
      profileData: JSON.parse(JSON.stringify(categoryPatterns)),
      categoryPatterns: JSON.parse(JSON.stringify(categoryPatterns)),
      totalEstimatesAnalyzed: estimates.length,
      totalDocumentsProcessed: docs.length,
      totalMaterialsTracked: materialLibrary.length,
      totalInvoicesProcessed: invoiceCount,
      avgOverallMarkup: average(allMarkups),
      avgLaborRate: average(allLaborRates),
    },
    update: {
      profileData: JSON.parse(JSON.stringify(categoryPatterns)),
      categoryPatterns: JSON.parse(JSON.stringify(categoryPatterns)),
      totalEstimatesAnalyzed: estimates.length,
      totalDocumentsProcessed: docs.length,
      totalMaterialsTracked: materialLibrary.length,
      totalInvoicesProcessed: invoiceCount,
      avgOverallMarkup: average(allMarkups),
      avgLaborRate: average(allLaborRates),
      lastUpdated: new Date(),
    },
  })

  return categoryPatterns
}
