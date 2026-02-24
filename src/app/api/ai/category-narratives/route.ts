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
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Check if narratives already exist
    const existing = estimate.proposalData as unknown as ProposalData | null
    if (existing?.categoryNarratives && existing.categoryNarratives.length > 0) {
      return NextResponse.json({ categoryNarratives: existing.categoryNarratives })
    }

    // Group line items by category
    const categories: Record<string, string[]> = {}
    for (const item of estimate.lineItems) {
      if (!categories[item.category]) categories[item.category] = []
      categories[item.category].push(item.description)
    }

    const categorySummary = Object.entries(categories)
      .map(([cat, items]) => `${cat}: ${items.join(", ")}`)
      .join("\n")

    // Light AI call — just 1-2 sentence narratives per category
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `For each construction category below, write a 1-2 sentence professional description suitable for a client-facing estimate. Focus on what will be done, materials, and approach. Do NOT mention prices.

Project: ${estimate.title}
Description: ${estimate.description}

Categories and items:
${categorySummary}

Return ONLY a JSON array, no other text:
[{"category": "Category Name", "narrative": "Professional description."}]`,
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
