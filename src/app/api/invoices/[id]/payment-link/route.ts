import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { requireFeature } from "@/lib/tiers"

/**
 * POST /api/invoices/[id]/payment-link
 * Creates a Stripe payment link for an estimate and saves it to the estimate record.
 * Requires Stripe Connect onboarding to be complete.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: estimateId } = await params

    // Load estimate + user Stripe Connect info
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      select: {
        id: true,
        userId: true,
        title: true,
        totalAmount: true,
        stripePaymentLink: true,
        user: {
          select: {
            stripeConnectAccountId: true,
            stripeConnectOnboarded: true,
          },
        },
      },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 })
    }

    if (!estimate.user.stripeConnectAccountId || !estimate.user.stripeConnectOnboarded) {
      return NextResponse.json(
        { error: "Please complete Stripe Connect setup in Settings before generating payment links." },
        { status: 400 }
      )
    }

    // Return existing payment link if one was already generated
    if (estimate.stripePaymentLink) {
      return NextResponse.json({ url: estimate.stripePaymentLink })
    }

    const connectedAccountId = estimate.user.stripeConnectAccountId

    // Create a Stripe Price for this specific amount
    const price = await stripe.prices.create(
      {
        currency: "usd",
        unit_amount: Math.round(estimate.totalAmount * 100), // Convert to cents
        product_data: {
          name: estimate.title,
          metadata: {
            estimateId: estimate.id,
          },
        },
      },
      {
        stripeAccount: connectedAccountId,
      }
    )

    // Create a payment link
    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: {
          estimateId: estimate.id,
          userId: estimate.userId,
        },
      },
      {
        stripeAccount: connectedAccountId,
      }
    )

    // Save payment link to estimate
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { stripePaymentLink: paymentLink.url },
    })

    return NextResponse.json({ url: paymentLink.url })
  } catch (error) {
    console.error("Payment link generation error:", error)
    const errMsg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to generate payment link: ${errMsg}` },
      { status: 500 }
    )
  }
}
