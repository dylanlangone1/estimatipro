"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getEstimates() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.estimate.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { lineItems: true } },
      client: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })
}

export async function getEstimateById(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      editHistory: { orderBy: { createdAt: "desc" } },
      client: true,
    },
  })

  if (!estimate || estimate.userId !== session.user.id) return null

  return estimate
}

export async function deleteEstimate(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const estimate = await prisma.estimate.findUnique({ where: { id } })
  if (!estimate || estimate.userId !== session.user.id) {
    throw new Error("Not found")
  }

  await prisma.estimate.delete({ where: { id } })
  revalidatePath("/estimates")
}

export async function updateEstimateStatus(
  id: string,
  status: "DRAFT" | "SENT" | "WON" | "LOST" | "EXPIRED" | "IN_PROGRESS" | "COMPLETED"
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const estimate = await prisma.estimate.findUnique({ where: { id } })
  if (!estimate || estimate.userId !== session.user.id) {
    throw new Error("Not found")
  }

  await prisma.estimate.update({
    where: { id },
    data: { status },
  })

  revalidatePath(`/estimate/${id}`)
  revalidatePath("/estimates")
}
