import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import type { CategoryNarrative, ProposalData } from "@/types/proposal"

/**
 * POST /api/ai/category-narratives
 * Generate short category narratives for the client-facing estimate view.
 * Available to ALL tiers (not MAX-gated).
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { estimateId } = await req.json()
    if (!estimateId) {
      return NextResponse.json({ error: "Estimate ID required" }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        user: { select: { companyName: true, trades: true } },
      },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Check if narratives already exist
    const existing = estimate.proposalData as unknown as ProposalData | null
    if (existing?.categoryNarratives && existing.categoryNarratives.length > 0) {
      return NextResponse.json({ categoryNarratives: existing.categoryNarratives })
    }

    // Group line items by category with full detail
    const catGroups: Record<string, typeof estimate.lineItems> = {}
    for (const item of estimate.lineItems) {
      if (!catGroups[item.category]) catGroups[item.category] = []
      catGroups[item.category].push(item)
    }

    const categorySummary = Object.entries(catGroups)
      .map(([cat, items]) => {
        const catTotal = items.reduce((sum, i) => sum + i.totalCost, 0)
        const lines = items.map((item) => {
          let line = `  - ${item.description}: ${item.quantity} ${item.unit} @ $${item.unitCost.toFixed(2)}/${item.unit}`
          const costParts: string[] = []
          if (item.laborCost) costParts.push(`Labor: $${item.laborCost.toLocaleString()}`)
          if (item.materialCost) costParts.push(`Material: $${item.materialCost.toLocaleString()}`)
          if (costParts.length > 0) line += ` (${costParts.join(" | ")})`
          return line
        })
        return `Category: ${cat} (${items.length} items, $${catTotal.toLocaleString()} total)\n${lines.join("\n")}`
      })
      .join("\n\n")

    // Contractor context for more tailored language
    const contractorContext = [
      estimate.user.companyName && `Company: ${estimate.user.companyName}`,
      estimate.user.trades?.length && `Trades: ${estimate.user.trades.join(", ")}`,
    ].filter(Boolean).join("\n")

    // AI call with rich context for specific, professional narratives
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are writing professional scope-of-work descriptions for a client-facing construction estimate. For each category below, write a 2-3 sentence narrative that:
- Describes the specific work to be performed
- References actual materials, quantities, and methods from the line items
- Sounds professional and confidence-inspiring for a homeowner or property manager
- Does NOT mention any dollar amounts, costs, or pricing

Project: ${estimate.title}
${estimate.projectType ? `Type: ${estimate.projectType.replace(/_/g, " ")}` : ""}
Description: ${estimate.description}
${contractorContext ? `\nContractor:\n${contractorContext}` : ""}

Detailed line items by category:
${categorySummary}

Return ONLY a JSON array, no other text:
[{"category": "Category Name", "narrative": "Professional description referencing specific materials and scope."}]`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Could not parse narratives response")
    }

    const categoryNarratives: CategoryNarrative[] = JSON.parse(jsonMatch[0])

    // Merge into existing proposalData
    const updatedData = {
      ...(existing || {}),
      categoryNarratives,
    }

    await prisma.estimate.update({
      where: { id: estimateId },
      data: { proposalData: JSON.parse(JSON.stringify(updatedData)) },
    })

    return NextResponse.json({ categoryNarratives })
  } catch (error) {
    console.error("Category narratives error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate narratives" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ai/category-narratives
 * Save user-edited category narratives.
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { estimateId, categoryNarratives } = await req.json()
    if (!estimateId || !categoryNarratives) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      select: { userId: true, proposalData: true },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const existing = (estimate.proposalData as unknown as ProposalData) || {}
    const updatedData = { ...existing, categoryNarratives }

    await prisma.estimate.update({
      where: { id: estimateId },
      data: { proposalData: JSON.parse(JSON.stringify(updatedData)) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save narratives error:", error)
    return NextResponse.json({ error: "Failed to save narratives" }, { status: 500 })
  }
}
