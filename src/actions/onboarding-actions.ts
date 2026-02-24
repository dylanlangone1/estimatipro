"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TRADES } from "@/lib/trades"

export async function saveTradeSelection(trades: string[], primaryTrade: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Validate trades — every key must be a valid trade
  const validKeys = Object.keys(TRADES)
  const invalidTrades = trades.filter((t) => !validKeys.includes(t))
  if (invalidTrades.length > 0) {
    throw new Error(`Invalid trade(s): ${invalidTrades.join(", ")}`)
  }

  if (!trades.includes(primaryTrade) && validKeys.includes(primaryTrade)) {
    trades = [...trades, primaryTrade]
  }

  if (trades.length === 0) {
    throw new Error("Please select at least one trade")
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      trades,
      primaryTrade,
      onboardingComplete: true,
    },
  })

  return { success: true }
}
