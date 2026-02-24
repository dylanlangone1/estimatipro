import { prisma } from "@/lib/prisma"
import { TIER_FEATURES, TIER_ORDER, type TierFeatureKey, type TierName } from "@/lib/constants"
import type { SubscriptionTier } from "@/generated/prisma/client"

/**
 * Fetch the user's current subscription tier from the database.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  })
  return user?.tier ?? "FREE"
}

/**
 * Check if a tier has access to a given feature.
 * For boolean features, returns the boolean value.
 * For numeric features (estimatesPerMonth, uploadsPerMonth), returns true if > 0.
 */
export function hasFeature(tier: SubscriptionTier, feature: TierFeatureKey): boolean {
  const value = TIER_FEATURES[tier][feature]
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value > 0
  return false
}

/**
 * Check if userTier is at least the required tier level.
 */
export function tierAtLeast(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const userIndex = TIER_ORDER.indexOf(userTier as TierName)
  const requiredIndex = TIER_ORDER.indexOf(requiredTier as TierName)
  return userIndex >= requiredIndex
}

/**
 * Get the minimum tier required to unlock a feature.
 */
export function getRequiredTier(feature: TierFeatureKey): TierName {
  for (const tier of TIER_ORDER) {
    if (hasFeature(tier as SubscriptionTier, feature)) {
      return tier
    }
  }
  return "MAX"
}

/**
 * Server-side guard: throws if the user's tier doesn't have the feature.
 * Use in API routes to protect endpoints.
 */
export async function requireFeature(userId: string, feature: TierFeatureKey): Promise<void> {
  const tier = await getUserTier(userId)
  if (!hasFeature(tier, feature)) {
    const required = getRequiredTier(feature)
    throw new TierError(
      `This feature requires a ${TIER_FEATURES[required].name} plan or higher.`,
      required,
      feature
    )
  }
}

/**
 * Check monthly usage limits (estimates, uploads).
 * Returns whether the user is allowed to perform the action, plus current/limit counts.
 */
export async function checkLimit(
  userId: string,
  feature: "estimatesPerMonth" | "uploadsPerMonth"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const tier = await getUserTier(userId)
  const limit = TIER_FEATURES[tier][feature] as number

  // Infinity means unlimited
  if (limit === Infinity) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  // Count usage for current calendar month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let current: number

  if (feature === "estimatesPerMonth") {
    current = await prisma.estimate.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    })
  } else {
    // uploadsPerMonth
    current = await prisma.uploadedDocument.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    })
  }

  return {
    allowed: current < limit,
    current,
    limit,
  }
}

/**
 * Custom error class for tier-related failures.
 */
export class TierError extends Error {
  public requiredTier: TierName
  public feature: TierFeatureKey

  constructor(message: string, requiredTier: TierName, feature: TierFeatureKey) {
    super(message)
    this.name = "TierError"
    this.requiredTier = requiredTier
    this.feature = feature
  }
}
