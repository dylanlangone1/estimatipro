import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"

/**
 * GET /api/settings/payment
 * Returns the user's payment & invoice settings (bank details, Stripe status, invoice defaults).
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "fullProposals")
    } catch {
      return NextResponse.json({ error: "Requires Max plan" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        bankName: true,
        bankRoutingNumber: true,
        bankAccountNumber: true,
        bankAccountType: true,
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
        proposalLogoWatermark: true,
        invoicePaymentDays: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      bankName: user.bankName || "",
      bankRoutingNumber: user.bankRoutingNumber || "",
      // Return masked account number for display
      bankAccountNumber: user.bankAccountNumber
        ? "****" + user.bankAccountNumber.slice(-4)
        : "",
      bankAccountType: user.bankAccountType || "checking",
      stripeConnectAccountId: user.stripeConnectAccountId || null,
      stripeConnectOnboarded: user.stripeConnectOnboarded,
      proposalLogoWatermark: user.proposalLogoWatermark,
      invoicePaymentDays: user.invoicePaymentDays,
    })
  } catch (error) {
    console.error("Payment settings GET error:", error)
    return NextResponse.json({ error: "Failed to load payment settings" }, { status: 500 })
  }
}

/**
 * PATCH /api/settings/payment
 * Updates the user's payment & invoice settings.
 * Does NOT update stripeConnectAccountId/stripeConnectOnboarded — those are managed by Stripe Connect routes.
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
      return NextResponse.json({ error: "Requires Max plan" }, { status: 403 })
    }

    const body = await req.json()
    const {
      bankName,
      bankRoutingNumber,
      bankAccountNumber,
      bankAccountType,
      proposalLogoWatermark,
      invoicePaymentDays,
    } = body

    // Build update object — only include fields that were explicitly provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}
    if (bankName !== undefined) updateData.bankName = bankName?.trim() || null
    if (bankRoutingNumber !== undefined) updateData.bankRoutingNumber = bankRoutingNumber?.trim() || null
    if (bankAccountType !== undefined) updateData.bankAccountType = bankAccountType || null

    // Only update account number if it's a real value (not a masked display value)
    if (bankAccountNumber !== undefined && !bankAccountNumber.startsWith("****")) {
      updateData.bankAccountNumber = bankAccountNumber?.trim() || null
    }

    if (proposalLogoWatermark !== undefined) {
      updateData.proposalLogoWatermark = Boolean(proposalLogoWatermark)
    }
    if (invoicePaymentDays !== undefined) {
      const days = parseInt(invoicePaymentDays, 10)
      if (!isNaN(days) && days > 0 && days <= 90) {
        updateData.invoicePaymentDays = days
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Payment settings PATCH error:", error)
    return NextResponse.json({ error: "Failed to save payment settings" }, { status: 500 })
  }
}
