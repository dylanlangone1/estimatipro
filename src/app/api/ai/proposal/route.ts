import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import type { ProposalData } from "@/types/proposal"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "fullProposals")
    } catch {
      return NextResponse.json(
        { error: "Full proposals require a Max plan." },
        { status: 403 }
      )
    }

    const { estimateId } = await req.json()
    if (!estimateId) {
      return NextResponse.json({ error: "Estimate ID required" }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        user: {
          select: {
            companyName: true,
            tagline: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            trades: true,
            licenseNumber: true,
          },
        },
        client: true,
      },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 })
    }

    // If proposalData already exists, return it
    if (estimate.proposalData) {
      return NextResponse.json(estimate.proposalData)
    }

    const user = estimate.user

    // Group line items by category for the prompt
    const categories: Record<string, Array<{ description: string; totalCost: number }>> = {}
    for (const item of estimate.lineItems) {
      if (!categories[item.category]) categories[item.category] = []
      categories[item.category].push({
        description: item.description,
        totalCost: item.totalCost,
      })
    }

    const categorySummary = Object.entries(categories)
      .map(
        ([cat, items]) =>
          `${cat}: ${items.map((i) => `${i.description} ($${i.totalCost.toFixed(2)})`).join(", ")}`
      )
      .join("\n")

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Generate professional proposal content for a construction estimate.

Company: ${user.companyName || "Not provided"}
Tagline: ${user.tagline || "Not provided"}
Trades: ${user.trades.join(", ") || "General contractor"}
License: ${user.licenseNumber || "Not provided"}
Address: ${[user.address, user.city, user.state, user.zip].filter(Boolean).join(", ") || "Not provided"}

Project: ${estimate.title}
Description: ${estimate.description}
Total: $${estimate.totalAmount.toFixed(2)}

Line Items by Category:
${categorySummary}

${estimate.client ? `Client: ${estimate.client.name}` : ""}

Return ONLY a JSON object with this exact structure, no other text:
{
  "aboutUs": "A 2-3 paragraph professional 'About Us' description for the company. Mention their specialties (${user.trades.join(", ")}), years of experience, commitment to quality, and what sets them apart. Write in third person. Make it compelling but realistic.",
  "scopeOfWork": [
    {"category": "Category Name", "narrative": "A detailed paragraph describing the work in this category, referencing specific items and explaining the approach, materials, and methodology."}
  ],
  "timeline": [
    {"phase": "Phase Name", "duration": "X weeks", "description": "What happens during this phase"}
  ],
  "terms": "Standard contractor terms and conditions including: payment schedule (50% deposit, progress payments, final payment on completion), change order policy, warranty information (1 year workmanship warranty), liability limitations, permit responsibilities, cleanup and disposal, and project cancellation terms. Write as a cohesive paragraph-style document, not bullet points."
}

Guidelines:
- aboutUs: Professional tone, 150-250 words. Highlight the trades and specialties.
- scopeOfWork: One entry per category from the estimate. Each narrative should be 50-100 words explaining what will be done.
- timeline: 4-6 phases that logically flow. Durations should be realistic for the project scope.
- terms: Comprehensive but standard. 200-300 words.`,
        },
      ],
    })

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse proposal response")
    }

    const proposalData: ProposalData = {
      ...JSON.parse(jsonMatch[0]),
      generatedAt: new Date().toISOString(),
    }

    // Save to estimate
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { proposalData: JSON.parse(JSON.stringify(proposalData)) },
    })

    return NextResponse.json(proposalData)
  } catch (error) {
    console.error("Proposal generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate proposal" },
      { status: 500 }
    )
  }
}
