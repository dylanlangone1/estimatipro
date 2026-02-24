"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createTrainingRuleSchema, updateTrainingRuleSchema } from "@/lib/validations"

export async function getTrainingRules() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const rules = await prisma.trainingRule.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { priority: "asc" }, // CRITICAL first (alphabetically first)
      { createdAt: "desc" },
    ],
  })

  return rules.map((rule) => ({
    id: rule.id,
    content: rule.content,
    category: rule.category,
    priority: rule.priority,
    source: rule.source,
    isActive: rule.isActive,
    timesApplied: rule.timesApplied,
    correctionLogId: rule.correctionLogId,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }))
}

export async function createTrainingRule(input: {
  content: string
  category: string
  priority: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validated = createTrainingRuleSchema.parse(input)

  const rule = await prisma.trainingRule.create({
    data: {
      userId: session.user.id,
      content: validated.content,
      category: validated.category,
      priority: validated.priority as "CRITICAL" | "IMPORTANT" | "PREFERENCE",
      source: "MANUAL",
    },
  })

  revalidatePath("/admin/training")
  return {
    id: rule.id,
    content: rule.content,
    category: rule.category,
    priority: rule.priority,
    source: rule.source,
    isActive: rule.isActive,
  }
}

export async function updateTrainingRule(input: {
  id: string
  content?: string
  category?: string
  priority?: string
  isActive?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validated = updateTrainingRuleSchema.parse(input)

  // Verify ownership
  const existing = await prisma.trainingRule.findUnique({
    where: { id: validated.id },
  })

  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Not found")
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {}
  if (validated.content !== undefined) updateData.content = validated.content
  if (validated.category !== undefined) updateData.category = validated.category
  if (validated.priority !== undefined) updateData.priority = validated.priority
  if (validated.isActive !== undefined) updateData.isActive = validated.isActive

  await prisma.trainingRule.update({
    where: { id: validated.id },
    data: updateData,
  })

  revalidatePath("/admin/training")
  return { success: true }
}

export async function deleteTrainingRule(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Verify ownership
  const existing = await prisma.trainingRule.findUnique({
    where: { id },
  })

  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Not found")
  }

  await prisma.trainingRule.delete({
    where: { id },
  })

  revalidatePath("/admin/training")
  return { success: true }
}

export async function getCorrectionLogs() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const corrections = await prisma.correctionLog.findMany({
    where: { userId: session.user.id },
    include: {
      estimate: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return corrections.map((c) => ({
    id: c.id,
    estimateId: c.estimateId,
    estimateTitle: c.estimate.title,
    correctionType: c.correctionType,
    fieldPath: c.fieldPath,
    previousValue: c.previousValue,
    newValue: c.newValue,
    context: c.context,
    extractedRule: c.extractedRule,
    similarCount: c.similarCount,
    promotedToRule: c.promotedToRule,
    createdAt: c.createdAt.toISOString(),
  }))
}

export async function getTrainingStats() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const [totalRules, activeRules, correctionCount, autoLearnedCount] =
    await Promise.all([
      prisma.trainingRule.count({
        where: { userId: session.user.id },
      }),
      prisma.trainingRule.count({
        where: { userId: session.user.id, isActive: true },
      }),
      prisma.correctionLog.count({
        where: { userId: session.user.id },
      }),
      prisma.trainingRule.count({
        where: {
          userId: session.user.id,
          source: { in: ["AUTO_LEARNED", "CORRECTION"] },
        },
      }),
    ])

  return { totalRules, activeRules, correctionCount, autoLearnedCount }
}
