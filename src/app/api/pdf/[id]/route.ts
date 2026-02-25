import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { EstimatePDF } from "@/components/pdf/estimate-pdf"
import { BrandedEstimatePDF } from "@/components/pdf/branded-estimate-pdf"
import { ProposalPDF } from "@/components/pdf/proposal-pdf"
import { ClientEstimatePDF } from "@/components/pdf/client-estimate-pdf"
import { requireFeature, tierAtLeast } from "@/lib/tiers"
import { DEFAULT_TERMS } from "@/app/api/settings/terms/route"
import React from "react"
import type { TemplateConfig, ProposalData, CategoryNarrative, TermsSection } from "@/types/proposal"

// Register Inter font for all PDF rendering
import "@/lib/pdf-fonts"

// PDF rendering + optional AI proposal generation can take 20–45 s — raise timeout
export const maxDuration = 300

/**
 * Strip AI prompt-engineering text injected during generation
 * (PROJECT LOCATION / PERMIT NOTE blocks) from stored descriptions
 * so they never appear in PDFs or the UI.
 */
function cleanDescription(raw: string): string {
  return raw.split("\n\nPROJECT LOCATION:")[0].split("\n\nPERMIT NOTE:")[0].trim()
}

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

/**
 * Generate a sequential invoice number from an estimate.
 * Format: INV-YYYY-NNN (zero-padded to 3 digits).
 */
function generateInvoiceNumber(estimateId: string, createdAt: Date): string {
  const year = createdAt.getFullYear()
  // Use last 3 hex chars of ID as a short sequential-ish number
  const num = parseInt(estimateId.slice(-3), 16) % 999 + 1
  return `INV-${year}-${num.toString().padStart(3, "0")}`
}

/** Mask an account number — show only last 4 digits. */
function maskAccount(account: string): string {
  if (account.length <= 4) return account
  return "****" + account.slice(-4)
}

/**
 * Resolve terms for a given estimate/user.
 * Priority: per-estimate override > user defaults > hardcoded fallback.
 */
async function resolveTerms(
  userId: string,
  estimateProposalData: unknown
): Promise<TermsSection[]> {
  // 1. Check per-estimate override
  const pd = estimateProposalData as Record<string, unknown> | null
  if (pd?.termsStructured && Array.isArray(pd.termsStructured)) {
    return pd.termsStructured as TermsSection[]
  }

  // 2. Check user defaults
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultTerms: true },
  })
  if (user?.defaultTerms) {
    return user.defaultTerms as unknown as TermsSection[]
  }

  // 3. Hardcoded fallback
  return DEFAULT_TERMS
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
            // Payment & invoice settings (MAX tier)
            bankName: true,
            bankRoutingNumber: true,
            bankAccountNumber: true,
            proposalLogoWatermark: true,
            invoicePaymentDays: true,
            stripeConnectOnboarded: true,
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

    // Use logo as-is if already a data URI (base64), otherwise convert
    const logoPath = user.logoUrl
      ? user.logoUrl.startsWith("data:")
        ? user.logoUrl
        : await fetchLogoAsBase64(user.logoUrl) ?? undefined
      : undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdfElement: any

    if (pdfType === "client") {
      // Client-facing PDF — available to ALL tiers, enhanced features for STANDARD+
      const includeTerms = tierAtLeast(user.tier, "STANDARD")
      const isPro = user.tier === "PRO" || user.tier === "MAX"

      // Build category summaries with markup baked in
      const catGroups: Record<string, { items: typeof lineItems; rawTotal: number }> = {}
      for (const item of lineItems) {
        if (!catGroups[item.category]) catGroups[item.category] = { items: [], rawTotal: 0 }
        catGroups[item.category].items.push(item)
        catGroups[item.category].rawTotal += item.totalCost
      }

      const multiplier = 1 + (estimate.markupPercent || 0) / 100

      // Get category narratives from proposalData
      const proposalDataRaw = estimate.proposalData as unknown as ProposalData | null
      const savedNarratives: CategoryNarrative[] = proposalDataRaw?.categoryNarratives || []

      const categories = Object.entries(catGroups).map(([category, data]) => ({
        category,
        narrative: savedNarratives.find((n) => n.category === category)?.narrative || "",
        clientTotal: data.rawTotal * multiplier,
        itemCount: data.items.length,
      }))

      const clientSubtotal = estimate.subtotal + estimate.markupAmount

      // Fetch brand colors for PRO+ users
      let primaryColor = "#E94560"
      let accentColor = "#1A1A2E"
      if (isPro) {
        const template = await prisma.brandTemplate.findFirst({
          where: { userId: session.user.id, isActive: true },
          orderBy: { updatedAt: "desc" },
        })
        if (template) {
          const tc = template.templateConfig as unknown as TemplateConfig
          primaryColor = tc.colors.primary
          accentColor = tc.colors.secondary
        }
      }

      // Resolve terms (structured sections)
      const termsStructured = includeTerms
        ? await resolveTerms(session.user.id, estimate.proposalData)
        : undefined

      pdfElement = React.createElement(ClientEstimatePDF, {
        title: estimate.title,
        description: cleanDescription(estimate.description),
        categories,
        clientSubtotal,
        taxAmount: estimate.taxAmount,
        clientTotal: estimate.totalAmount,
        createdAt,
        companyName: user.companyName || undefined,
        companyPhone: user.phone || undefined,
        companyEmail: user.email,
        companyAddress,
        companyTagline: user.tagline || undefined,
        clientName: estimate.client?.name || undefined,
        logoPath: isPro ? logoPath : undefined,
        primaryColor,
        accentColor,
        includeTerms,
        termsStructured,
        isContract: estimate.isContract,
      })
    } else if (pdfType === "branded") {
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
        description: cleanDescription(estimate.description),
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
            body: { fontFamily: "Inter", alternateRowBg: true, categoryStyle: "banner" },
            totals: { style: "boxed", highlightColor: "#E94560" },
            footer: { showGeneratedBy: true, customText: "" },
            colors: { primary: "#E94560", secondary: "#1A1A2E", accent: "#16213E", text: "#1F2937", background: "#FFFFFF" },
          }

      // Proposal data must be pre-generated via /api/ai/proposal (proposal editor or export dropdown).
      // The PDF route only renders — it does not call the AI directly.
      const proposalData = estimate.proposalData as unknown as ProposalData | null
      const hasFullProposal = proposalData && "scopeOfWork" in proposalData && "aboutUs" in proposalData

      if (!hasFullProposal) {
        return NextResponse.json(
          { error: "Proposal content not generated yet. Use Export → Full Proposal or open the proposal editor first." },
          { status: 400 }
        )
      }

      // Resolve structured terms for proposal
      const termsStructured = await resolveTerms(session.user.id, estimate.proposalData)

      // Fetch project photo as base64 (same helper used for logo)
      const projectPhotoBase64 = estimate.projectPhotoUrl
        ? await fetchLogoAsBase64(estimate.projectPhotoUrl) ?? undefined
        : undefined

      // Build invoice details
      const resolvedInvoiceNumber =
        estimate.invoiceNumber || generateInvoiceNumber(estimate.id, estimate.createdAt)

      const resolvedDueDate = estimate.invoiceDueDate
        ? estimate.invoiceDueDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : (() => {
            const d = new Date(estimate.createdAt)
            d.setDate(d.getDate() + (user.invoicePaymentDays ?? 30))
            return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          })()

      const maskedAccount = user.bankAccountNumber
        ? maskAccount(user.bankAccountNumber)
        : undefined

      pdfElement = React.createElement(ProposalPDF, {
        title: estimate.title,
        description: cleanDescription(estimate.description),
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
        termsStructured,
        isContract: estimate.isContract,
        // New MAX-tier props
        projectPhotoUrl: projectPhotoBase64,
        showLogoWatermark: user.proposalLogoWatermark ?? false,
        invoiceNumber: resolvedInvoiceNumber,
        invoiceDueDate: resolvedDueDate,
        bankName: user.bankName || undefined,
        bankRouting: user.bankRoutingNumber || undefined,
        bankAccount: maskedAccount,
        stripePaymentLink: estimate.stripePaymentLink || undefined,
      })
    } else {
      // Standard PDF — available to all tiers
      const isPro = user.tier === "PRO" || user.tier === "MAX"

      pdfElement = React.createElement(EstimatePDF, {
        title: estimate.title,
        description: cleanDescription(estimate.description),
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
        logoPath: isPro ? logoPath : undefined,
      })
    }

    const buffer = await renderToBuffer(pdfElement)

    const cleanTitle = estimate.title.replace(/[^a-zA-Z0-9 ]/g, "")
    const filename = pdfType === "proposal"
      ? `${cleanTitle} - Proposal`
      : pdfType === "client"
        ? `${cleanTitle} - Client Estimate`
        : cleanTitle

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : undefined
    console.error("PDF generation error:", errMsg)
    if (errStack) console.error("Stack:", errStack)
    return NextResponse.json(
      { error: `Failed to generate PDF: ${errMsg}` },
      { status: 500 }
    )
  }
}
