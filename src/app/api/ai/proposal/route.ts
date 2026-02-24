import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import type { ProposalData } from "@/types/proposal"

// Proposal generation via AI can take 30–60 s
export const maxDuration = 60

/**
 * POST /api/ai/proposal
 * Generate proposal content (or return cached). Supports optional section regeneration.
 */
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

    const { estimateId, regenerateSection } = await req.json()
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

    const user = estimate.user

    // Build context shared by full generation and section regeneration
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

    const companyContext = `Company: ${user.companyName || "Not provided"}
Tagline: ${user.tagline || "Not provided"}
Trades: ${user.trades.join(", ") || "General contractor"}
License: ${user.licenseNumber || "Not provided"}
Address: ${[user.address, user.city, user.state, user.zip].filter(Boolean).join(", ") || "Not provided"}`

    const projectContext = `Project: ${estimate.title}
Description: ${estimate.description}
Total: $${estimate.totalAmount.toFixed(2)}

Line Items by Category:
${categorySummary}

${estimate.client ? `Client: ${estimate.client.name}` : ""}`

    // If regenerating a single section
    if (regenerateSection) {
      const existing = estimate.proposalData as unknown as ProposalData | null
      const sectionData = await regenerateProposalSection(
        regenerateSection,
        companyContext,
        projectContext,
        user,
        estimate
      )

      // Merge regenerated section with existing data
      const updated: ProposalData = {
        aboutUs: existing?.aboutUs || "",
        scopeOfWork: existing?.scopeOfWork || [],
        timeline: existing?.timeline || [],
        terms: existing?.terms || "",
        exclusions: existing?.exclusions || "",
        warranty: existing?.warranty || "",
        generatedAt: existing?.generatedAt || new Date().toISOString(),
        ...sectionData,
      }

      return NextResponse.json(updated)
    }

    // If proposalData already exists, return it (with estimate title for the editor)
    if (estimate.proposalData) {
      const data = estimate.proposalData as unknown as ProposalData
      return NextResponse.json({
        ...data,
        // Ensure new fields have defaults
        exclusions: data.exclusions || "",
        warranty: data.warranty || "",
        _estimateTitle: estimate.title,
        _hasClient: !!estimate.clientId,
      })
    }

    // Check for client-specific proposal defaults (aboutUs + terms carry forward)
    let clientDefaults: { aboutUs?: string; terms?: string } = {}
    if (estimate.client?.proposalDefaults) {
      const defaults = estimate.client.proposalDefaults as unknown as { aboutUs?: string; terms?: string }
      clientDefaults = {
        aboutUs: defaults.aboutUs || undefined,
        terms: defaults.terms || undefined,
      }
    }

    // Generate full proposal
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Generate professional proposal content for a construction estimate.

${companyContext}

${projectContext}

Return ONLY a JSON object with this exact structure, no other text:
{
  "aboutUs": "A 2-3 paragraph professional 'About Us' description for the company. Mention their specialties (${user.trades.join(", ")}), commitment to quality, safety record, and what sets them apart. Write in third person. Make it compelling but realistic. 150-250 words.",
  "scopeOfWork": [
    {"category": "Category Name", "narrative": "A detailed paragraph describing the work in this category, referencing specific items and explaining the approach, materials, and methodology. 50-100 words each."}
  ],
  "timeline": [
    {"phase": "Phase Name", "duration": "X weeks", "description": "What happens during this phase"}
  ],
  "terms": "Standard contractor terms and conditions including: payment schedule (10% deposit upon signing, 30% at rough-in completion, 30% at finish work completion, 30% upon final walkthrough and approval), change order policy (written approval required, priced at cost + markup), warranty (1-year workmanship warranty from date of substantial completion), liability limitations, permit responsibilities, cleanup and disposal, and cancellation terms. Write as a cohesive paragraph-style document. 200-300 words.",
  "exclusions": "Items specifically NOT included in this estimate. List common exclusions relevant to this project type such as: furniture/fixtures not specified, landscaping beyond project footprint, hazardous material testing/abatement, architectural/engineering fees (if not included), utility company fees, HOA approvals, etc. Write as a clear, bulleted-style paragraph. 100-150 words.",
  "warranty": "Detailed warranty information covering: workmanship warranty period and terms, manufacturer material warranties (passed through), warranty claim process, what is and isn't covered, emergency repair provisions. Professional and reassuring tone. 100-150 words."
}

Guidelines:
- aboutUs: Professional tone, 150-250 words. Highlight the trades and specialties. Mention commitment to on-time, on-budget delivery.
- scopeOfWork: One entry per category from the estimate. Each narrative 50-100 words.
- timeline: 4-6 phases that logically flow. Durations realistic for the project scope and total.
- terms: Comprehensive but standard. Include specific payment milestone percentages.
- exclusions: Clear about what is NOT part of this scope.
- warranty: Reassuring, professional, specific about coverage.`,
        },
      ],
    })

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse proposal response")
    }

    const aiGenerated = JSON.parse(jsonMatch[0])

    // Override with client defaults if available (aboutUs and terms carry forward)
    const proposalData: ProposalData = {
      ...aiGenerated,
      ...(clientDefaults.aboutUs ? { aboutUs: clientDefaults.aboutUs } : {}),
      ...(clientDefaults.terms ? { terms: clientDefaults.terms } : {}),
      generatedAt: new Date().toISOString(),
    }

    // Ensure new fields have defaults
    if (!proposalData.exclusions) proposalData.exclusions = ""
    if (!proposalData.warranty) proposalData.warranty = ""

    // Save to estimate
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { proposalData: JSON.parse(JSON.stringify(proposalData)) },
    })

    return NextResponse.json({
      ...proposalData,
      _estimateTitle: estimate.title,
      _hasClient: !!estimate.clientId,
    })
  } catch (error) {
    console.error("Proposal generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate proposal" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ai/proposal
 * Save edited proposal data back to the estimate.
 */
export async function PATCH(req: Request) {
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

    const { estimateId, proposalData, saveAsClientDefault } = await req.json()
    if (!estimateId || !proposalData) {
      return NextResponse.json({ error: "Estimate ID and proposal data required" }, { status: 400 })
    }

    // Verify ownership
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      select: { userId: true, clientId: true },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 })
    }

    // Save proposal data to estimate
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { proposalData: JSON.parse(JSON.stringify(proposalData)) },
    })

    // Optionally save aboutUs + terms as client defaults for future proposals
    if (saveAsClientDefault && estimate.clientId) {
      const clientDefaults = {
        aboutUs: proposalData.aboutUs || "",
        terms: proposalData.terms || "",
      }
      await prisma.client.update({
        where: { id: estimate.clientId },
        data: { proposalDefaults: JSON.parse(JSON.stringify(clientDefaults)) },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Proposal save error:", error)
    return NextResponse.json(
      { error: "Failed to save proposal" },
      { status: 500 }
    )
  }
}

/**
 * Regenerate a single section of the proposal using AI.
 */
async function regenerateProposalSection(
  section: string,
  companyContext: string,
  projectContext: string,
  user: { trades: string[]; companyName: string | null; licenseNumber: string | null },
  estimate: { title: string; totalAmount: number }
): Promise<Partial<ProposalData>> {
  const sectionPrompts: Record<string, string> = {
    aboutUs: `Generate a professional 'About Us' section for a construction company proposal.

${companyContext}

Write 2-3 paragraphs (150-250 words) in third person. Mention their specialties (${user.trades.join(", ")}), commitment to quality, safety, and on-time delivery. Make it compelling but realistic.

Return ONLY a JSON object: {"aboutUs": "the text"}`,

    scopeOfWork: `Generate scope of work narratives for a construction proposal.

${companyContext}

${projectContext}

Write one narrative paragraph (50-100 words) per category from the line items. Each should describe the approach, materials, and methodology.

Return ONLY a JSON object: {"scopeOfWork": [{"category": "Name", "narrative": "Description"}]}`,

    timeline: `Generate a realistic project timeline for a construction proposal.

${projectContext}

Create 4-6 phases that logically flow for this project. Durations should be realistic for the scope and total ($${estimate.totalAmount.toFixed(2)}).

Return ONLY a JSON object: {"timeline": [{"phase": "Name", "duration": "X weeks", "description": "Details"}]}`,

    terms: `Generate standard contractor terms and conditions for a construction proposal.

Project: ${estimate.title}
Total: $${estimate.totalAmount.toFixed(2)}

Include: payment schedule (10% deposit, 30% rough-in, 30% finish, 30% completion), change order policy, warranty, liability, permits, cleanup, cancellation. Write as cohesive paragraphs (200-300 words).

Return ONLY a JSON object: {"terms": "the text"}`,

    exclusions: `Generate a professional exclusions section for a construction proposal.

${projectContext}

List items NOT included in this estimate. Common exclusions for this project type. Clear, professional, 100-150 words.

Return ONLY a JSON object: {"exclusions": "the text"}`,

    warranty: `Generate a warranty section for a construction proposal.

Company: ${user.companyName || "Not provided"}

Cover: workmanship warranty period, manufacturer warranties (passed through), claim process, coverage details, emergency repairs. Professional and reassuring, 100-150 words.

Return ONLY a JSON object: {"warranty": "the text"}`,
  }

  const prompt = sectionPrompts[section]
  if (!prompt) {
    throw new Error(`Unknown section: ${section}`)
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Could not parse regenerated ${section}`)
  }

  return JSON.parse(jsonMatch[0])
}
