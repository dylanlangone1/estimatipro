import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { requireFeature } from "@/lib/tiers"

/**
 * POST /api/stripe/connect
 * Start Stripe Connect Express onboarding. Creates a Stripe account (if needed) and
 * returns the onboarding URL to redirect the user to.
 */
export async function POST() {
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
        email: true,
        stripeConnectAccountId: true,
        stripeConnectOnboarded: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let accountId = user.stripeConnectAccountId

    // Create a new Stripe Express account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          stripeConnectAccountId: accountId,
          stripeConnectOnboarded: false,
        },
      })
    }

    // Build return URLs
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.estimaipro.com"
    const returnUrl = `${appUrl}/dashboard/settings?stripe=success`
    const refreshUrl = `${appUrl}/dashboard/settings?stripe=refresh`

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error)
    return NextResponse.json({ error: "Failed to start Stripe onboarding" }, { status: 500 })
  }
}
