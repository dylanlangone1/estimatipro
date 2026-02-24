import { prisma } from "@/lib/prisma"
import type { SupplierInvoiceParseResult } from "./supplier-invoice-parser"

/**
 * Extracts brand names from parsed supplier invoice items
 * and upserts them into the MaterialBrand table.
 * Increments `timesUsed` on repeat encounters.
 */
export async function extractAndSaveBrands(
  userId: string,
  invoiceData: SupplierInvoiceParseResult
): Promise<number> {
  let savedCount = 0

  for (const item of invoiceData.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandName = (item as any).brandName as string | undefined | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productLine = (item as any).productLine as string | undefined | null
    const category = item.category || "Other"

    if (!brandName || brandName.trim().length === 0) continue

    try {
      // Upsert — create if new, increment timesUsed if existing
      await prisma.materialBrand.upsert({
        where: {
          userId_brandName_category: {
            userId,
            brandName: brandName.trim(),
            category,
          },
        },
        update: {
          timesUsed: { increment: 1 },
          lastSeenAt: new Date(),
          // Update product line if we now have one and didn't before
          ...(productLine ? { productLine: productLine.trim() } : {}),
        },
        create: {
          userId,
          brandName: brandName.trim(),
          category,
          productLine: productLine?.trim() || null,
        },
      })
      savedCount++
    } catch (err) {
      // Non-fatal — log and continue
      console.error(`Failed to save brand "${brandName}" in ${category}:`, err)
    }
  }

  return savedCount
}

/**
 * Retrieves a user's saved brands formatted for injection into AI prompts.
 * Returns empty string if no brands saved.
 */
export async function getBrandContext(userId: string): Promise<string> {
  const brands = await prisma.materialBrand.findMany({
    where: { userId },
    orderBy: [{ timesUsed: "desc" }, { lastSeenAt: "desc" }],
    take: 30,
  })

  if (brands.length === 0) return ""

  // Group by category
  const grouped: Record<string, Array<{ brandName: string; productLine: string | null; timesUsed: number }>> = {}
  for (const b of brands) {
    if (!grouped[b.category]) grouped[b.category] = []
    grouped[b.category].push({
      brandName: b.brandName,
      productLine: b.productLine,
      timesUsed: b.timesUsed,
    })
  }

  const lines = Object.entries(grouped).map(([category, items]) => {
    const brandList = items
      .map((b) => b.productLine ? `${b.brandName} (${b.productLine})` : b.brandName)
      .join(", ")
    return `- ${category}: ${brandList}`
  })

  return `\nUSER'S PREFERRED BRANDS (use when relevant to the project type):\n${lines.join("\n")}\n`
}
