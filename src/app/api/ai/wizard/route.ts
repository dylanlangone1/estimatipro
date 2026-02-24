import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { rateLimit } from "@/lib/rate-limit"

// AI wizard responses can take 15–30 s
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 15 wizard queries per minute per user
    const { allowed } = rateLimit(`wizard:${session.user.id}`, 15, 60_000)
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      )
    }

    // STANDARD+ tier (pricingDNA is a STANDARD+ feature we can reuse for gating)
    try {
      await requireFeature(session.user.id, "pricingDNA")
    } catch {
      return NextResponse.json(
        { error: "AI Wizard requires a Standard plan or higher." },
        { status: 403 }
      )
    }

    const { estimateId, question } = await req.json()
    if (!estimateId || !question) {
      return NextResponse.json(
        { error: "Estimate ID and question are required" },
        { status: 400 }
      )
    }

    // Load estimate with line items
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        client: true,
      },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Build context about the estimate
    const categories: Record<string, { items: string[]; total: number }> = {}
    for (const item of estimate.lineItems) {
      if (!categories[item.category]) categories[item.category] = { items: [], total: 0 }
      categories[item.category].items.push(
        `${item.description}: ${item.quantity} ${item.unit} × $${item.unitCost.toFixed(2)} = $${item.totalCost.toFixed(2)}`
      )
      categories[item.category].total += item.totalCost
    }

    const categoryBreakdown = Object.entries(categories)
      .map(([cat, data]) => `${cat} ($${data.total.toFixed(2)}):\n${data.items.map((i) => `  - ${i}`).join("\n")}`)
      .join("\n\n")

    const totalLabor = estimate.lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0)
    const totalMaterial = estimate.lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0)

    const estimateContext = `
ESTIMATE DETAILS:
Title: ${estimate.title}
Description: ${estimate.description}
Project Type: ${estimate.projectType || "Not specified"}
Client: ${estimate.client?.name || "Not assigned"}
Status: ${estimate.status}

FINANCIAL SUMMARY:
Subtotal: $${estimate.subtotal.toFixed(2)}
Markup: ${estimate.markupPercent}% ($${estimate.markupAmount.toFixed(2)})
Tax: $${estimate.taxAmount.toFixed(2)}
Total: $${estimate.totalAmount.toFixed(2)}
${totalLabor > 0 ? `Total Labor: $${totalLabor.toFixed(2)}` : ""}
${totalMaterial > 0 ? `Total Materials: $${totalMaterial.toFixed(2)}` : ""}

LINE ITEMS BY CATEGORY:
${categoryBreakdown}
`.trim()

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: `You are an expert construction estimating advisor built into EstimAI Pro. You help contractors review estimates, suggest improvements, check pricing, and answer questions about their projects.

Be direct, actionable, and specific. Reference actual numbers from the estimate when relevant. Format your response with short paragraphs — no bullet lists unless the user specifically asks for one.

Keep responses concise (2-4 paragraphs max). If you suggest changes, be specific about amounts and line items.`,
      messages: [
        {
          role: "user",
          content: `Here is the current estimate I'm working on:\n\n${estimateContext}\n\nMy question: ${question}`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""

    return NextResponse.json({ answer: text })
  } catch (error) {
    console.error("AI Wizard error:", error)
    return NextResponse.json(
      { error: "Failed to get AI advice" },
      { status: 500 }
    )
  }
}
