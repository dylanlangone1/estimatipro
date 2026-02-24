import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TIER_FEATURES } from "@/lib/constants"
import { Users, TrendingUp, CreditCard, Clock } from "lucide-react"

const TIER_PRICE: Record<string, number> = { STANDARD: 49, PRO: 99, MAX: 199 }

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || session.user.email !== adminEmail) redirect("/dashboard")

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [tierCounts, trialCount, signups7d, signups30d, recentSignups, activeByTier] =
    await Promise.all([
      prisma.user.groupBy({ by: ["tier"], _count: { tier: true } }),
      prisma.user.count({ where: { subscriptionStatus: "trialing" } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, name: true, email: true, tier: true, subscriptionStatus: true, createdAt: true },
      }),
      prisma.user.groupBy({
        by: ["tier"],
        where: { tier: { not: "FREE" }, subscriptionStatus: { not: "trialing" } },
        _count: { tier: true },
      }),
    ])

  const byTier: Record<string, number> = { FREE: 0, STANDARD: 0, PRO: 0, MAX: 0 }
  for (const row of tierCounts) byTier[row.tier] = row._count.tier

  const totalUsers = Object.values(byTier).reduce((a, b) => a + b, 0)
  const activeSubscribers = (byTier.STANDARD ?? 0) + (byTier.PRO ?? 0) + (byTier.MAX ?? 0)
  const mrr = activeByTier.reduce((sum, row) => sum + (TIER_PRICE[row.tier] ?? 0) * row._count.tier, 0)

  const tierVariant = (tier: string) => {
    if (tier === "MAX") return "error"
    if (tier === "PRO") return "warning"
    if (tier === "STANDARD") return "success"
    return "default"
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted mt-1">User metrics, signups, and subscription overview.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="h-6 w-6 text-brand-orange mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
            <p className="text-xs text-muted">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CreditCard className="h-6 w-6 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{activeSubscribers}</p>
            <p className="text-xs text-muted">Subscribers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Clock className="h-6 w-6 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{trialCount}</p>
            <p className="text-xs text-muted">Active Trials</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <TrendingUp className="h-6 w-6 text-info mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">${mrr.toLocaleString()}</p>
            <p className="text-xs text-muted">Est. MRR</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier breakdown + signups */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {(["FREE", "STANDARD", "PRO", "MAX"] as const).map((tier) => (
          <Card key={tier}>
            <CardContent className="py-4 flex items-center justify-between px-6">
              <div>
                <p className="text-sm font-medium text-muted">{TIER_FEATURES[tier].name}</p>
                <p className="text-2xl font-bold text-foreground">{byTier[tier] ?? 0}</p>
              </div>
              <Badge variant={tierVariant(tier) as "default" | "success" | "warning" | "error" | "info"}>
                {tier}
              </Badge>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="py-4 px-6">
            <p className="text-sm font-medium text-muted">New signups</p>
            <div className="flex items-end gap-4 mt-1">
              <div>
                <p className="text-2xl font-bold text-foreground">{signups7d}</p>
                <p className="text-xs text-muted">Last 7 days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{signups30d}</p>
                <p className="text-xs text-muted">Last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent signups table */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-foreground">Recent Signups</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left px-4 py-3 text-muted font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Plan</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((u) => (
                  <tr key={u.id} className="border-b border-card-border last:border-b-0">
                    <td className="px-4 py-3 text-foreground">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={tierVariant(u.tier) as "default" | "success" | "warning" | "error" | "info"}>
                        {u.tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.subscriptionStatus ? (
                        <span className={`text-xs font-medium ${
                          u.subscriptionStatus === "trialing" ? "text-warning" :
                          u.subscriptionStatus === "active" ? "text-success" : "text-muted"
                        }`}>
                          {u.subscriptionStatus}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
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
