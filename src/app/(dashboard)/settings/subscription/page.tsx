import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TIER_FEATURES } from "@/lib/constants"
import { CreditCard, Check, ArrowUpCircle } from "lucide-react"
import Link from "next/link"

export default async function SubscriptionPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      tier: true,
      stripeCurrentPeriodEnd: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
    },
  })

  if (!user) return null

  const tierInfo = TIER_FEATURES[user.tier]
  const isFreeTier = user.tier === "FREE"
  const isTrialing = user.subscriptionStatus === "trialing"

  const trialDaysLeft = isTrialing && user.stripeCurrentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(user.stripeCurrentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold text-foreground">Current Plan</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Badge variant={isFreeTier ? "default" : "success"}>
                  {tierInfo.name}
                </Badge>
                {isTrialing && (
                  <Badge variant="warning">
                    Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left
                  </Badge>
                )}
                {!isFreeTier && (
                  <span className="text-lg font-bold text-foreground">
                    ${tierInfo.price}/mo
                  </span>
                )}
              </div>
              {isTrialing && user.stripeCurrentPeriodEnd && (
                <p className="text-sm text-muted">
                  Trial ends{" "}
                  {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  — your card will be charged ${tierInfo.price} automatically
                </p>
              )}
              {!isTrialing && user.stripeCurrentPeriodEnd && (
                <p className="text-sm text-muted">
                  Next billing date:{" "}
                  {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {isFreeTier && (
                <p className="text-sm text-muted">
                  Start a 7-day free trial — upgrade for unlimited estimates and premium features
                </p>
              )}
            </div>
            {isFreeTier ? (
              <Link href="/pricing">
                <Button>
                  <ArrowUpCircle className="h-4 w-4 mr-1.5" />
                  Start Free Trial
                </Button>
              </Link>
            ) : (
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  Change Plan
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-foreground">Plan Comparison</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left px-4 py-3 text-muted font-medium">Feature</th>
                  {(["FREE", "STANDARD", "PRO", "MAX"] as const).map((tier) => (
                    <th
                      key={tier}
                      className={`text-center px-4 py-3 font-medium ${
                        tier === user.tier ? "text-brand-orange" : "text-muted"
                      }`}
                    >
                      {TIER_FEATURES[tier].name}
                      {tier !== "FREE" && (
                        <span className="block text-xs mt-0.5">
                          ${TIER_FEATURES[tier].price}/mo
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "AI Estimates/mo", key: "estimatesPerMonth" as const },
                  { label: "Historical Uploads", key: "historicalUpload" as const },
                  { label: "Pricing DNA", key: "pricingDNA" as const },
                  { label: "Deviation Alerts", key: "deviationAlerts" as const },
                  { label: "Branded PDFs", key: "brandedPdf" as const },
                  { label: "Logo Upload", key: "logoUpload" as const },
                  { label: "Win/Loss Tracking", key: "winLossTracking" as const },
                  { label: "Client Management", key: "clientManagement" as const },
                  { label: "Full Proposals", key: "fullProposals" as const },
                ].map((feature) => (
                  <tr
                    key={feature.key}
                    className="border-b border-card-border last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-foreground">{feature.label}</td>
                    {(["FREE", "STANDARD", "PRO", "MAX"] as const).map((tier) => {
                      const value = TIER_FEATURES[tier][feature.key]
                      return (
                        <td
                          key={tier}
                          className={`text-center px-4 py-2.5 ${
                            tier === user.tier ? "bg-brand-orange/5" : ""
                          }`}
                        >
                          {typeof value === "boolean" ? (
                            value ? (
                              <Check className="h-4 w-4 text-success mx-auto" />
                            ) : (
                              <span className="text-muted">—</span>
                            )
                          ) : value === Infinity ? (
                            <span className="text-foreground font-medium">Unlimited</span>
                          ) : (
                            <span className="text-foreground">{value}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
