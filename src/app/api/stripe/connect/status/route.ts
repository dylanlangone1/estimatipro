import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

/**
 * GET /api/stripe/connect/status
 * Checks if Stripe Connect onboarding is complete and updates the user record.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
      },
    })

    if (!user?.stripeConnectAccountId) {
      return NextResponse.json({ connected: false, onboarded: false })
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId)
    const onboarded = account.details_submitted && account.charges_enabled

    // Sync status to DB
    if (onboarded !== user.stripeConnectOnboarded) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeConnectOnboarded: onboarded },
      })
    }

    return NextResponse.json({
      connected: true,
      onboarded,
      accountId: user.stripeConnectAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      email: account.email,
    })
  } catch (error) {
    console.error("Stripe Connect status error:", error)
    return NextResponse.json({ error: "Failed to check Stripe status" }, { status: 500 })
  }
}
