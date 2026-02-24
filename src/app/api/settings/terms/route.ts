import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import type { TermsSection } from "@/types/proposal"

/**
 * Default terms sections — used as fallback when user has no custom terms.
 * These are the same 6 paragraphs previously hardcoded in client-estimate-pdf.tsx.
 */
export const DEFAULT_TERMS: TermsSection[] = [
  {
    id: "payment",
    title: "Payment Terms",
    content:
      "A deposit of 30% of the total project cost is required prior to commencement of work. Progress payments shall be made at milestones agreed upon by both parties. Final payment is due upon substantial completion and client walkthrough. All payments are due within 15 days of invoice date.",
    enabled: true,
  },
  {
    id: "timeline",
    title: "Project Timeline",
    content:
      "Work shall commence within 14 business days of contract signing and receipt of deposit, subject to material availability and permitting requirements. Any delays caused by weather, material shortages, or client-requested changes may extend the timeline. Contractor shall keep client informed of progress and any anticipated schedule changes.",
    enabled: true,
  },
  {
    id: "changes",
    title: "Change Orders",
    content:
      "Any changes to the scope of work after contract signing shall be documented in writing as a Change Order. Change Orders will include a description of the additional or modified work, associated costs, and impact to timeline. No additional work shall begin until the Change Order is approved and signed by both parties.",
    enabled: true,
  },
  {
    id: "warranty",
    title: "Warranty",
    content:
      "Contractor warrants all workmanship for a period of one (1) year from date of substantial completion. Manufacturer warranties on materials and products are passed through to the client. This warranty does not cover damage resulting from misuse, neglect, or normal wear and tear.",
    enabled: true,
  },
  {
    id: "exclusions",
    title: "Exclusions",
    content:
      "Unless specifically included in the scope of work above, the following are excluded: permit fees, engineering or architectural drawings, hazardous material abatement (asbestos, lead paint), unforeseen structural repairs, landscaping restoration beyond immediate work area, and furniture/appliance relocation.",
    enabled: true,
  },
  {
    id: "insurance",
    title: "Insurance & Liability",
    content:
      "Contractor maintains general liability insurance and workers compensation coverage. Certificates of insurance are available upon request. Client is responsible for maintaining homeowner insurance during the project period. Contractor is not liable for pre-existing conditions discovered during construction.",
    enabled: true,
  },
]

/**
 * GET /api/settings/terms
 * Returns user's custom terms or the default fallback.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultTerms: true },
    })

    const terms = (user?.defaultTerms as unknown as TermsSection[]) || DEFAULT_TERMS

    return NextResponse.json({ terms })
  } catch (error) {
    console.error("Get terms error:", error)
    return NextResponse.json({ error: "Failed to fetch terms" }, { status: 500 })
  }
}

/**
 * PUT /api/settings/terms
 * Save user's custom terms sections. Requires STANDARD+ tier.
 */
export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireFeature(session.user.id, "editableTerms")

    const { terms } = await req.json()

    // Validate structure
    if (!Array.isArray(terms)) {
      return NextResponse.json({ error: "Terms must be an array" }, { status: 400 })
    }

    for (const section of terms) {
      if (
        !section ||
        typeof section.id !== "string" ||
        typeof section.title !== "string" ||
        section.title.trim().length === 0 ||
        typeof section.content !== "string" ||
        typeof section.enabled !== "boolean"
      ) {
        return NextResponse.json(
          { error: "Each term section must have id, title, content, and enabled fields" },
          { status: 400 }
        )
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { defaultTerms: JSON.parse(JSON.stringify(terms)) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save terms error:", error)
    if (error instanceof Error && error.name === "TierError") {
      return NextResponse.json(
        { error: "Editable terms require a Standard plan or higher." },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: "Failed to save terms" }, { status: 500 })
  }
}

/**
 * POST /api/settings/terms
 * AI-generate default terms based on user's trades. Requires STANDARD+ tier.
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireFeature(session.user.id, "editableTerms")

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyName: true, trades: true, state: true },
    })

    const { anthropic, AI_MODEL } = await import("@/lib/anthropic")

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Generate professional terms & conditions sections for a construction contractor's client-facing estimates and contracts.

Company: ${user?.companyName || "Not specified"}
Trades: ${user?.trades?.join(", ") || "General construction"}
State: ${user?.state || "Not specified"}

Generate 6 sections that are industry-standard, professional, and protective for both contractor and client. Each section should be 2-4 sentences.

Return ONLY a JSON array:
[{"id": "unique_id", "title": "Section Title", "content": "Section content text.", "enabled": true}]

Include sections for: Payment Terms, Project Timeline, Change Orders, Warranty, Exclusions, Insurance & Liability. Tailor the language to the specific trades if provided.`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Could not parse AI response")
    }

    const generatedTerms: TermsSection[] = JSON.parse(jsonMatch[0])

    return NextResponse.json({ terms: generatedTerms })
  } catch (error) {
    console.error("Generate terms error:", error)
    if (error instanceof Error && error.name === "TierError") {
      return NextResponse.json(
        { error: "This feature requires a Standard plan or higher." },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: "Failed to generate terms" }, { status: 500 })
  }
}
