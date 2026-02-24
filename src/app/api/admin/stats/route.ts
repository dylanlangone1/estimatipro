import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const TIER_PRICE: Record<string, number> = {
  STANDARD: 49,
  PRO: 99,
  MAX: 199,
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [tierCounts, trialCount, signups7d, signups30d, recentSignups] = await Promise.all([
    // Users grouped by tier
    prisma.user.groupBy({
      by: ["tier"],
      _count: { tier: true },
    }),

    // Active trials
    prisma.user.count({
      where: { subscriptionStatus: "trialing" },
    }),

    // Signups last 7 days
    prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),

    // Signups last 30 days
    prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),

    // Recent 10 signups
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    }),
  ])

  // Build tier map
  const byTier: Record<string, number> = { FREE: 0, STANDARD: 0, PRO: 0, MAX: 0 }
  for (const row of tierCounts) {
    byTier[row.tier] = row._count.tier
  }

  const totalUsers = Object.values(byTier).reduce((a, b) => a + b, 0)
  const activeSubscribers = (byTier.STANDARD ?? 0) + (byTier.PRO ?? 0) + (byTier.MAX ?? 0)

  // MRR: only count active (non-trialing) paid users
  const activeByTier = await prisma.user.groupBy({
    by: ["tier"],
    where: {
      tier: { not: "FREE" },
      subscriptionStatus: { not: "trialing" },
    },
    _count: { tier: true },
  })
  const mrr = activeByTier.reduce((sum, row) => {
    return sum + (TIER_PRICE[row.tier] ?? 0) * row._count.tier
  }, 0)

  return NextResponse.json({
    totalUsers,
    activeSubscribers,
    trialCount,
    mrr,
    byTier,
    signups7d,
    signups30d,
    recentSignups,
  })
}
