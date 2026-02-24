import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type { SubscriptionTier } from "@/generated/prisma/client"

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {}
if (process.env.STRIPE_STANDARD_PRICE_ID) PRICE_TO_TIER[process.env.STRIPE_STANDARD_PRICE_ID] = "STANDARD"
if (process.env.STRIPE_PRO_PRICE_ID) PRICE_TO_TIER[process.env.STRIPE_PRO_PRICE_ID] = "PRO"
if (process.env.STRIPE_MAX_PRICE_ID) PRICE_TO_TIER[process.env.STRIPE_MAX_PRICE_ID] = "MAX"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const item = subscription.items.data[0]
          const priceId = item?.price.id
          const tier = PRICE_TO_TIER[priceId] || "STANDARD"

          await prisma.user.update({
            where: { stripeCustomerId: customerId },
            data: {
              tier,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              subscriptionStatus: subscription.status,
              stripeCurrentPeriodEnd: item?.current_period_end
                ? new Date(item.current_period_end * 1000)
                : null,
            },
          })
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object
        const subDetails = invoice.parent?.subscription_details
        const subscriptionId =
          typeof subDetails?.subscription === "string"
            ? subDetails.subscription
            : subDetails?.subscription?.id

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const item = subscription.items.data[0]
          await prisma.user.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              subscriptionStatus: subscription.status,
              stripeCurrentPeriodEnd: item?.current_period_end
                ? new Date(item.current_period_end * 1000)
                : null,
            },
          })
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        const item = subscription.items.data[0]
        const priceId = item?.price.id
        const tier = PRICE_TO_TIER[priceId] || "STANDARD"

        await prisma.user.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            tier,
            stripePriceId: priceId,
            subscriptionStatus: subscription.status,
            stripeCurrentPeriodEnd: item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
          },
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object

        await prisma.user.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            tier: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
            subscriptionStatus: "canceled",
          },
        })
        break
      }
    }
  } catch (error) {
    console.error(
      `[STRIPE WEBHOOK CRITICAL] Event ${event.type} (${event.id}) failed:`,
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }

  return new Response(null, { status: 200 })
}
