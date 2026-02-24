import Stripe from "stripe"

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set")
  }
  return new Stripe(secretKey, { typescript: true })
}

// Lazy singleton — only created on first use, not at import time
let _client: Stripe | null = null
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_client) _client = getStripeClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_client as any)[prop]
  },
})

export const PLANS = {
  STANDARD: {
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || "",
    tier: "STANDARD" as const,
  },
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    tier: "PRO" as const,
  },
  MAX: {
    priceId: process.env.STRIPE_MAX_PRICE_ID || "",
    tier: "MAX" as const,
  },
} as const
