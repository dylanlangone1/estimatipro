import { prisma } from "@/lib/prisma"
import type { ContextRuleMatch } from "@/types/training"

/**
 * Match context rules against a project description.
 * Returns all active rules where:
 * - userId matches OR userId is null (system defaults)
 * - For KEYWORD rules: triggerValue appears in description (case-insensitive)
 * - For ALWAYS rules: always matched
 */
export async function matchContextRules(
  description: string,
  userId: string
): Promise<ContextRuleMatch[]> {
  // Fetch all active rules for this user + system defaults
  const rules = await prisma.contextRule.findMany({
    where: {
      isActive: true,
      OR: [{ userId }, { userId: null }],
    },
  })

  const descLower = description.toLowerCase()

  return rules.filter((rule) => {
    switch (rule.triggerType) {
      case "KEYWORD":
        return descLower.includes(rule.triggerValue.toLowerCase())
      case "ALWAYS":
        return true
      case "CATEGORY":
      case "PROJECT_TYPE":
        // These match against specific fields — for now, check description
        return descLower.includes(rule.triggerValue.toLowerCase())
      default:
        return false
    }
  }).map((rule) => ({
    id: rule.id,
    triggerType: rule.triggerType,
    triggerValue: rule.triggerValue,
    mustInclude: rule.mustInclude,
    mustExclude: rule.mustExclude,
    mustAssume: rule.mustAssume,
    neverAssume: rule.neverAssume,
  }))
}

/**
 * Merge multiple context rule matches into a single deduplicated set.
 */
export function mergeContextRules(
  matches: ContextRuleMatch[]
): {
  mustInclude: string[]
  mustExclude: string[]
  mustAssume: string[]
  neverAssume: string[]
} {
  const mustInclude = new Set<string>()
  const mustExclude = new Set<string>()
  const mustAssume = new Set<string>()
  const neverAssume = new Set<string>()

  for (const match of matches) {
    match.mustInclude.forEach((v) => mustInclude.add(v))
    match.mustExclude.forEach((v) => mustExclude.add(v))
    match.mustAssume.forEach((v) => mustAssume.add(v))
    match.neverAssume.forEach((v) => neverAssume.add(v))
  }

  return {
    mustInclude: Array.from(mustInclude),
    mustExclude: Array.from(mustExclude),
    mustAssume: Array.from(mustAssume),
    neverAssume: Array.from(neverAssume),
  }
}
