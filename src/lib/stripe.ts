import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

export const PLANS = {
  STANDARD: {
    priceId: process.env.STRIPE_STANDARD_PRICE_ID!,
    tier: "STANDARD" as const,
  },
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    tier: "PRO" as const,
  },
  MAX: {
    priceId: process.env.STRIPE_MAX_PRICE_ID!,
    tier: "MAX" as const,
  },
} as const
