import { prisma } from "@/lib/prisma"
import { matchContextRules, mergeContextRules } from "./context-rule-engine"
import type { TrainingContext } from "@/types/training"

/**
 * Loads all training context for a user + description.
 * Used by generate and edit routes to build enhanced system prompts.
 */
export async function loadTrainingContext(
  userId: string,
  description: string
): Promise<TrainingContext> {
  const [trainingRules, matchedContextRules, recentCorrections] =
    await Promise.all([
      // Active training rules, ordered by priority
      prisma.trainingRule.findMany({
        where: { userId, isActive: true },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          content: true,
          priority: true,
          category: true,
        },
      }),

      // Match context rules against description
      matchContextRules(description, userId),

      // Recent corrections with extracted rules
      prisma.correctionLog.findMany({
        where: {
          userId,
          extractedRule: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          extractedRule: true,
        },
      }),
    ])

  const mergedContext = mergeContextRules(matchedContextRules)

  return {
    trainingRules: trainingRules.map((r) => ({
      content: r.content,
      priority: r.priority,
      category: r.category,
    })),
    matchedContextRules,
    mergedContext,
    recentCorrections: recentCorrections
      .filter((c) => c.extractedRule !== null)
      .map((c) => ({ extractedRule: c.extractedRule! })),
  }
}
