import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { EstimatePDF } from "@/components/pdf/estimate-pdf"
import { BrandedEstimatePDF } from "@/components/pdf/branded-estimate-pdf"
import { ProposalPDF } from "@/components/pdf/proposal-pdf"
import { requireFeature } from "@/lib/tiers"
import React from "react"
import type { TemplateConfig, ProposalData } from "@/types/proposal"

/**
 * Fetches a logo image and converts it to a base64 data URI.
 * @react-pdf/renderer handles data URIs reliably, avoiding CORS
 * and network issues that occur with external URLs (Vercel Blob, etc.).
 */
async function fetchLogoAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return null

    const contentType = response.headers.get("content-type") || "image/png"
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    return `data:${contentType};base64,${base64}`
  } catch (error) {
    console.error("Failed to fetch logo for PDF:", error)
    return null
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const url = new URL(req.url)
    const pdfType = url.searchParams.get("type") || "standard"

    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        user: {
          select: {
            companyName: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            logoUrl: true,
            tier: true,
            tagline: true,
            trades: true,
          },
        },
        client: true,
      },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const user = estimate.user
    const lineItems = estimate.lineItems.map((item) => ({
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
      laborCost: item.laborCost,
      materialCost: item.materialCost,
    }))

    const createdAt = estimate.createdAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    const assumptions = (estimate.assumptions as string[]) || []
    const companyAddress = [user.address, user.city, user.state, user.zip]
      .filter(Boolean)
      .join(", ") || undefined

    // Convert logo to base64 data URI for reliable PDF embedding
    // External URLs (Vercel Blob) can fail due to CORS in @react-pdf/renderer
    const logoPath = user.logoUrl
      ? await fetchLogoAsBase64(user.logoUrl) ?? undefined
      : undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdfElement: any

    if (pdfType === "branded") {
      // PRO+ tier required
      try {
        await requireFeature(session.user.id, "brandedPdf")
      } catch {
        return NextResponse.json(
          { error: "Branded PDFs require a Pro plan or higher" },
          { status: 403 }
        )
      }

      // Fetch active brand template
      const template = await prisma.brandTemplate.findFirst({
        where: { userId: session.user.id, isActive: true },
        orderBy: { updatedAt: "desc" },
      })

      if (!template) {
        return NextResponse.json(
          { error: "No brand template found. Create one in Settings > Brand." },
          { status: 400 }
        )
      }

      const templateConfig = template.templateConfig as unknown as TemplateConfig

      pdfElement = React.createElement(BrandedEstimatePDF, {
        title: estimate.title,
        description: estimate.description,
        lineItems,
        subtotal: estimate.subtotal,
        markupPercent: estimate.markupPercent,
        markupAmount: estimate.markupAmount,
        taxAmount: estimate.taxAmount,
        totalAmount: estimate.totalAmount,
        createdAt,
        assumptions,
        companyName: user.companyName || undefined,
        companyPhone: user.phone || undefined,
        companyEmail: user.email,
        companyAddress,
        companyTagline: user.tagline || undefined,
        logoPath,
        templateConfig,
      })
    } else if (pdfType === "proposal") {
      // MAX tier required
      try {
        await requireFeature(session.user.id, "fullProposals")
      } catch {
        return NextResponse.json(
          { error: "Full proposals require a Max plan" },
          { status: 403 }
        )
      }

      // Fetch template
      const template = await prisma.brandTemplate.findFirst({
        where: { userId: session.user.id, isActive: true },
        orderBy: { updatedAt: "desc" },
      })

      // Use default template if none exists
      const templateConfig: TemplateConfig = template
        ? (template.templateConfig as unknown as TemplateConfig)
        : {
            header: { logoPosition: "left", showTagline: true, borderStyle: "accent", bgColor: "#E94560" },
            body: { fontFamily: "Helvetica", alternateRowBg: true, categoryStyle: "banner" },
            totals: { style: "boxed", highlightColor: "#E94560" },
            footer: { showGeneratedBy: true, customText: "" },
            colors: { primary: "#E94560", secondary: "#1A1A2E", accent: "#16213E", text: "#1F2937", background: "#FFFFFF" },
          }

      // Get or generate proposal data
      let proposalData = estimate.proposalData as unknown as ProposalData | null

      if (!proposalData) {
        const { anthropic, AI_MODEL } = await import("@/lib/anthropic")

        const categories: Record<string, Array<{ description: string; totalCost: number }>> = {}
        for (const item of estimate.lineItems) {
          if (!categories[item.category]) categories[item.category] = []
          categories[item.category].push({ description: item.description, totalCost: item.totalCost })
        }

        const categorySummary = Object.entries(categories)
          .map(([cat, items]) => `${cat}: ${items.map((i) => `${i.description} ($${i.totalCost.toFixed(2)})`).join(", ")}`)
          .join("\n")

        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: `Generate professional proposal content for a construction estimate.

Company: ${user.companyName || "Not provided"}
Trades: ${user.trades.join(", ") || "General contractor"}
Project: ${estimate.title}
Description: ${estimate.description}
Total: $${estimate.totalAmount.toFixed(2)}

Line Items by Category:
${categorySummary}

Return ONLY a JSON object:
{
  "aboutUs": "2-3 paragraph about us",
  "scopeOfWork": [{"category": "Name", "narrative": "Description"}],
  "timeline": [{"phase": "Name", "duration": "X weeks", "description": "Details"}],
  "terms": "Standard contractor terms paragraph"
}`,
          }],
        })

        const text = response.content[0].type === "text" ? response.content[0].text : ""
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error("Could not parse proposal")

        proposalData = { ...JSON.parse(jsonMatch[0]), generatedAt: new Date().toISOString() }

        await prisma.estimate.update({
          where: { id: estimate.id },
          data: { proposalData: JSON.parse(JSON.stringify(proposalData)) },
        })
      }

      pdfElement = React.createElement(ProposalPDF, {
        title: estimate.title,
        description: estimate.description,
        lineItems,
        subtotal: estimate.subtotal,
        markupPercent: estimate.markupPercent,
        markupAmount: estimate.markupAmount,
        taxAmount: estimate.taxAmount,
        totalAmount: estimate.totalAmount,
        createdAt,
        assumptions,
        companyName: user.companyName || undefined,
        companyPhone: user.phone || undefined,
        companyEmail: user.email,
        companyAddress,
        companyTagline: user.tagline || undefined,
        clientName: estimate.client?.name || undefined,
        logoPath,
        templateConfig,
        proposalData: proposalData!,
      })
    } else {
      // Standard PDF — available to all tiers
      const isPro = user.tier === "PRO" || user.tier === "MAX"

      pdfElement = React.createElement(EstimatePDF, {
        title: estimate.title,
        description: estimate.description,
        lineItems,
        subtotal: estimate.subtotal,
        markupPercent: estimate.markupPercent,
        markupAmount: estimate.markupAmount,
        taxAmount: estimate.taxAmount,
        totalAmount: estimate.totalAmount,
        createdAt,
        assumptions,
        ...(isPro
          ? {
              companyName: user.companyName || undefined,
              companyPhone: user.phone || undefined,
              companyEmail: user.email,
              companyAddress,
            }
          : {}),
      })
    }

    const buffer = await renderToBuffer(pdfElement)

    const filename = pdfType === "proposal"
      ? `${estimate.title.replace(/[^a-zA-Z0-9 ]/g, "")} - Proposal`
      : estimate.title.replace(/[^a-zA-Z0-9 ]/g, "")

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
