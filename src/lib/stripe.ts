import Stripe from "stripe"

let _client: Stripe | null = null

function getClient(): Stripe {
  if (!_client) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    _client = new Stripe(secretKey, { typescript: true })
  }
  return _client
}

// Lazy singleton — uses explicit getters to delegate to the real Stripe
// client only at call time (not at import/build time). This avoids the
// build-time crash when STRIPE_SECRET_KEY is absent from the build env,
// while also ensuring SDK resource objects receive the correct `this`
// context (unlike a raw Proxy that can lose binding).
export const stripe = {
  get customers() {
    return getClient().customers
  },
  get checkout() {
    return getClient().checkout
  },
  get webhooks() {
    return getClient().webhooks
  },
  get subscriptions() {
    return getClient().subscriptions
  },
} as unknown as Stripe

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
