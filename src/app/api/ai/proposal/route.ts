import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { withRetry, LIGHT_RETRY } from "@/lib/ai/retry-utils"
import { extractJson } from "@/lib/ai/json-utils"
import type { ProposalData } from "@/types/proposal"

// Proposal generation via AI can take 30–60 s
export const maxDuration = 300

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
            proposalDefaults: true,
          },
        },
        client: true,
      },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 })
    }

    const user = estimate.user

    // Load saved ProposalDefaults (user's saved templates)
    const savedDefaults = user.proposalDefaults as {
      aboutUs?: string
      timelineTemplate?: Array<{ phase: string; duration: string; description: string }>
      warranty?: string
      exclusions?: string
    } | null

    // Build context shared by all generation paths
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
Subtotal: $${estimate.subtotal.toFixed(2)}
Markup: ${estimate.markupPercent}%

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
        estimate,
        savedDefaults
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
        projectOverview: existing?.projectOverview || "",
        investmentSummary: existing?.investmentSummary || "",
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
        projectOverview: data.projectOverview || "",
        investmentSummary: data.investmentSummary || "",
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

    // Only ask AI to generate sections that aren't already covered by saved defaults.
    // Saved defaults are merged in AFTER the AI call — never embedded in the prompt.
    // This keeps prompts small and cuts response time by 40-60%.
    const needAboutUs = !savedDefaults?.aboutUs && !clientDefaults.aboutUs
    const needTimeline = !savedDefaults?.timelineTemplate
    const needWarranty = !savedDefaults?.warranty
    const needExclusions = !savedDefaults?.exclusions

    const sectionSpecs = [
      needAboutUs
        ? `"aboutUs": "2-3 paragraphs, third person. Company specialties (${user.trades.join(", ")}), quality, reliability. 100-130 words."`
        : null,
      `"scopeOfWork": [{"category": "Category Name", "narrative": "Approach, materials, methods. 40-60 words."}]`,
      needTimeline
        ? `"timeline": [{"phase": "Phase Name", "duration": "X weeks", "description": "What happens"}]`
        : null,
      `"terms": "Payment schedule (10% deposit/30%/30%/30%), change orders, liability, permits, cleanup. 150-200 words."`,
      needExclusions ? `"exclusions": "Items NOT included. 60-90 words."` : null,
      needWarranty ? `"warranty": "Workmanship warranty, claim process. 60-90 words."` : null,
      `"projectOverview": "Executive summary: scope, value, key highlights. Reference total investment. 80-120 words."`,
      `"investmentSummary": "Value delivered. 30/40/30 payment structure and milestones. Reassuring. 60-80 words."`,
    ].filter(Boolean).join(",\n  ")

    // Generate full proposal (only the sections that need AI)
    const response = await withRetry(
      "proposal-generate",
      () => anthropic.messages.create(
        {
          model: AI_MODEL,
          max_tokens: 3000,
          messages: [
            {
              role: "user",
              content: `Generate professional construction proposal content. Return ONLY valid JSON — no preamble or explanation.

${companyContext}

${projectContext}

JSON structure to return:
{
  ${sectionSpecs}
}

Rules: one scopeOfWork entry per category from the line items. All text must be professional contractor language.`,
            },
          ],
        },
        { timeout: 60_000 }, // 60s — prevents loading forever on hung connections
      ),
      LIGHT_RETRY,
    )

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""

    let aiGenerated: Record<string, unknown>
    try {
      aiGenerated = JSON.parse(extractJson(text))
    } catch {
      throw new Error("AI returned malformed JSON for proposal")
    }

    // Merge AI output with saved defaults (saved defaults win over AI-generated content)
    const ai = aiGenerated as Record<string, unknown>
    const proposalData: ProposalData = {
      aboutUs: clientDefaults.aboutUs || savedDefaults?.aboutUs || (ai.aboutUs as string) || "",
      scopeOfWork: (ai.scopeOfWork as ProposalData["scopeOfWork"]) || [],
      timeline: savedDefaults?.timelineTemplate
        ? (savedDefaults.timelineTemplate as ProposalData["timeline"])
        : (ai.timeline as ProposalData["timeline"]) || [],
      terms: clientDefaults.terms || (ai.terms as string) || "",
      exclusions: savedDefaults?.exclusions || (ai.exclusions as string) || "",
      warranty: savedDefaults?.warranty || (ai.warranty as string) || "",
      projectOverview: (ai.projectOverview as string) || "",
      investmentSummary: (ai.investmentSummary as string) || "",
      generatedAt: new Date().toISOString(),
    }

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
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to generate proposal: ${msg.slice(0, 200)}` },
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
  estimate: { title: string; totalAmount: number },
  savedDefaults: {
    aboutUs?: string
    timelineTemplate?: Array<{ phase: string; duration: string; description: string }>
    warranty?: string
    exclusions?: string
  } | null
): Promise<Partial<ProposalData>> {
  const sectionPrompts: Record<string, string> = {
    aboutUs: savedDefaults?.aboutUs
      ? `Return ONLY this JSON object verbatim: {"aboutUs": ${JSON.stringify(savedDefaults.aboutUs)}}`
      : `Generate a professional 'About Us' section for a construction company proposal.

${companyContext}

Write 2-3 paragraphs (150-250 words) in third person. Mention their specialties (${user.trades.join(", ")}), commitment to quality, safety, on-time delivery.

Return ONLY a JSON object: {"aboutUs": "the text"}`,

    scopeOfWork: `Generate scope of work narratives for a construction proposal.

${companyContext}

${projectContext}

Write one narrative paragraph (50-100 words) per category from the line items. Each should describe the approach, materials, and methodology.

Return ONLY a JSON object: {"scopeOfWork": [{"category": "Name", "narrative": "Description"}]}`,

    timeline: savedDefaults?.timelineTemplate
      ? `Adapt these saved timeline phases for this specific project. Keep the phase names and structure but adjust durations and descriptions to fit the project scope.

${projectContext}

Saved phases to adapt:
${JSON.stringify(savedDefaults.timelineTemplate, null, 2)}

Return ONLY a JSON object: {"timeline": [{"phase": "Name", "duration": "X weeks", "description": "Details"}]}`
      : `Generate a realistic project timeline for a construction proposal.

${projectContext}

Create 4-6 phases that logically flow for this project. Durations should be realistic for the scope and total ($${estimate.totalAmount.toFixed(2)}).

Return ONLY a JSON object: {"timeline": [{"phase": "Name", "duration": "X weeks", "description": "Details"}]}`,

    terms: `Generate standard contractor terms and conditions for a construction proposal.

Project: ${estimate.title}
Total: $${estimate.totalAmount.toFixed(2)}

Include: payment schedule (10% deposit, 30% rough-in, 30% finish, 30% completion), change order policy, warranty, liability, permits, cleanup, cancellation. Write as cohesive paragraphs (200-300 words).

Return ONLY a JSON object: {"terms": "the text"}`,

    exclusions: savedDefaults?.exclusions
      ? `Return ONLY this JSON object verbatim: {"exclusions": ${JSON.stringify(savedDefaults.exclusions)}}`
      : `Generate a professional exclusions section for a construction proposal.

${projectContext}

List items NOT included in this estimate. Common exclusions for this project type. Clear, professional, 100-150 words.

Return ONLY a JSON object: {"exclusions": "the text"}`,

    warranty: savedDefaults?.warranty
      ? `Return ONLY this JSON object verbatim: {"warranty": ${JSON.stringify(savedDefaults.warranty)}}`
      : `Generate a warranty section for a construction proposal.

Company: ${user.companyName || "Not provided"}

Cover: workmanship warranty period, manufacturer warranties (passed through), claim process, coverage details, emergency repairs. Professional and reassuring, 100-150 words.

Return ONLY a JSON object: {"warranty": "the text"}`,

    projectOverview: `Generate a project overview (executive summary) for a construction proposal.

${companyContext}

${projectContext}

Write 2-3 paragraphs (150-200 words). What the client will receive, the value delivered, key highlights. Reference the total investment.

Return ONLY a JSON object: {"projectOverview": "the text"}`,

    investmentSummary: `Generate an investment summary section for a construction proposal.

Project: ${estimate.title}
Total: $${estimate.totalAmount.toFixed(2)}

Write 2 paragraphs (100-150 words total). First: value delivered for the investment. Second: the suggested 30/40/30 payment structure and what triggers each milestone. Professional and reassuring.

Return ONLY a JSON object: {"investmentSummary": "the text"}`,
  }

  const prompt = sectionPrompts[section]
  if (!prompt) {
    throw new Error(`Unknown section: ${section}`)
  }

  const response = await withRetry(
    `proposal-regenerate-${section}`,
    () => anthropic.messages.create(
      {
        model: AI_MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: 60_000 }, // 60s — prevents loading forever on hung connections
    ),
    LIGHT_RETRY,
  )

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  try {
    return JSON.parse(extractJson(text))
  } catch {
    throw new Error(`Could not parse regenerated ${section} — AI returned malformed JSON`)
  }
}
