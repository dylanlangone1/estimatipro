"use client"

import { Lock, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TIER_FEATURES, TIER_ORDER, type TierFeatureKey, type TierName } from "@/lib/constants"
import type { SubscriptionTier } from "@/generated/prisma/client"
import Link from "next/link"
import { cn } from "@/lib/utils"

function hasFeatureClient(tier: SubscriptionTier, feature: TierFeatureKey): boolean {
  const value = TIER_FEATURES[tier][feature]
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value > 0
  return false
}

function getRequiredTierClient(feature: TierFeatureKey): TierName {
  for (const tier of TIER_ORDER) {
    if (hasFeatureClient(tier as SubscriptionTier, feature)) {
      return tier
    }
  }
  return "MAX"
}

interface TierGateProps {
  feature: TierFeatureKey
  userTier: SubscriptionTier
  children: React.ReactNode
  fallback?: "blur" | "lock" | "hide" | "upgrade"
  className?: string
}

export function TierGate({
  feature,
  userTier,
  children,
  fallback = "lock",
  className,
}: TierGateProps) {
  const allowed = hasFeatureClient(userTier, feature)

  if (allowed) {
    return <>{children}</>
  }

  const requiredTier = getRequiredTierClient(feature)
  const tierName = TIER_FEATURES[requiredTier].name

  if (fallback === "hide") {
    return null
  }

  if (fallback === "blur") {
    return (
      <div className={cn("relative", className)}>
        <div className="blur-sm pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-xl">
          <div className="text-center p-6">
            <Lock className="h-8 w-8 text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              {tierName} Feature
            </p>
            <p className="text-xs text-muted mb-4">
              Upgrade to {tierName} to unlock this feature
            </p>
            <Link href="/pricing">
              <Button size="sm">
                <ArrowUpCircle className="h-4 w-4 mr-1.5" />
                Upgrade to {tierName}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (fallback === "upgrade") {
    return (
      <div
        className={cn(
          "border border-dashed border-card-border rounded-xl p-8 text-center",
          className
        )}
      >
        <ArrowUpCircle className="h-10 w-10 text-brand-orange mx-auto mb-3" />
        <p className="font-semibold text-foreground mb-1">
          Unlock with {tierName}
        </p>
        <p className="text-sm text-muted mb-4 max-w-sm mx-auto">
          This feature is available on the {tierName} plan and above.
        </p>
        <Link href="/pricing">
          <Button>
            <ArrowUpCircle className="h-4 w-4 mr-1.5" />
            View Plans
          </Button>
        </Link>
      </div>
    )
  }

  // Default: "lock"
  return (
    <div
      className={cn(
        "border border-card-border rounded-xl p-6 text-center bg-card/50",
        className
      )}
    >
      <Lock className="h-6 w-6 text-muted mx-auto mb-2" />
      <p className="text-sm font-medium text-foreground mb-1">
        Upgrade to {tierName} to unlock
      </p>
      <p className="text-xs text-muted mb-3">
        This feature requires a {tierName} subscription.
      </p>
      <Link href="/pricing">
        <Button size="sm" variant="outline">
          <ArrowUpCircle className="h-4 w-4 mr-1.5" />
          Upgrade
        </Button>
      </Link>
    </div>
  )
}
