"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { EstimatePreferences } from "@/types/estimate-input"

export async function saveEstimatePreferences(prefs: EstimatePreferences) {
  const session = await auth()
  if (!session?.user?.id) return

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      estimatePreferences: JSON.parse(JSON.stringify(prefs)),
    },
  })
}
