import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { prisma } from "@/lib/prisma"
import { CORRECTION_ANALYSIS_PROMPT } from "./prompts"
import { correctionAnalysisSchema } from "@/lib/validations"

interface LineItemData {
  category: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
}

interface EstimateData {
  lineItems: LineItemData[]
  [key: string]: unknown
}

/**
 * Analyzes corrections made to an estimate and auto-learns rules.
 * Called fire-and-forget after estimate edits.
 */
export async function analyzeCorrectionAndLearn(
  userId: string,
  estimateId: string,
  previousData: Record<string, unknown>,
  newData: Record<string, unknown>,
  editPrompt: string
): Promise<void> {
  try {
    const prev = previousData as unknown as EstimateData
    const next = newData as unknown as EstimateData

    if (!prev.lineItems || !next.lineItems) return

    const corrections = detectCorrections(prev.lineItems, next.lineItems)

    if (corrections.length === 0) return

    // Create correction log entries
    for (const correction of corrections) {
      await prisma.correctionLog.create({
        data: {
          userId,
          estimateId,
          correctionType: correction.type,
          fieldPath: correction.fieldPath,
          previousValue: correction.previousValue,
          newValue: correction.newValue,
        },
      })
    }

    // Call AI to extract a general rule from this correction
    const ruleExtraction = await extractRuleFromCorrection(
      previousData,
      newData,
      editPrompt,
      corrections
    )

    if (!ruleExtraction) return

    // Update the most recent correction log with the extracted rule
    const recentLog = await prisma.correctionLog.findFirst({
      where: { userId, estimateId },
      orderBy: { createdAt: "desc" },
    })

    if (recentLog) {
      await prisma.correctionLog.update({
        where: { id: recentLog.id },
        data: {
          extractedRule: ruleExtraction.extractedRule,
          context: ruleExtraction.context,
        },
      })

      // Check for similar existing corrections (auto-promotion logic)
      await checkAndPromote(userId, ruleExtraction.extractedRule, ruleExtraction.category)
    }
  } catch (err) {
    console.error("Correction learning error:", err)
  }
}

/**
 * Compare before/after line items and detect what changed.
 */
function detectCorrections(
  prevItems: LineItemData[],
  nextItems: LineItemData[]
): Array<{
  type: "PRICE_CHANGE" | "ITEM_ADDED" | "ITEM_REMOVED" | "QUANTITY_CHANGE"
  fieldPath: string
  previousValue: string
  newValue: string
}> {
  const corrections: Array<{
    type: "PRICE_CHANGE" | "ITEM_ADDED" | "ITEM_REMOVED" | "QUANTITY_CHANGE"
    fieldPath: string
    previousValue: string
    newValue: string
  }> = []

  // Build maps by description for matching
  const prevMap = new Map<string, LineItemData>()
  prevItems.forEach((item) => {
    prevMap.set(item.description.toLowerCase(), item)
  })

  const nextMap = new Map<string, LineItemData>()
  nextItems.forEach((item) => {
    nextMap.set(item.description.toLowerCase(), item)
  })

  // Check for price changes and quantity changes
  for (const [desc, prevItem] of prevMap) {
    const nextItem = nextMap.get(desc)
    if (nextItem) {
      if (prevItem.unitCost !== nextItem.unitCost) {
        corrections.push({
          type: "PRICE_CHANGE",
          fieldPath: `lineItem[${desc}].unitCost`,
          previousValue: `$${prevItem.unitCost}/${prevItem.unit}`,
          newValue: `$${nextItem.unitCost}/${nextItem.unit}`,
        })
      }
      if (prevItem.quantity !== nextItem.quantity) {
        corrections.push({
          type: "QUANTITY_CHANGE",
          fieldPath: `lineItem[${desc}].quantity`,
          previousValue: `${prevItem.quantity} ${prevItem.unit}`,
          newValue: `${nextItem.quantity} ${nextItem.unit}`,
        })
      }
    } else {
      corrections.push({
        type: "ITEM_REMOVED",
        fieldPath: `lineItem[${desc}]`,
        previousValue: `${prevItem.description} ($${prevItem.totalCost})`,
        newValue: "removed",
      })
    }
  }

  // Check for added items
  for (const [desc, nextItem] of nextMap) {
    if (!prevMap.has(desc)) {
      corrections.push({
        type: "ITEM_ADDED",
        fieldPath: `lineItem[${desc}]`,
        previousValue: "not present",
        newValue: `${nextItem.description} ($${nextItem.totalCost})`,
      })
    }
  }

  return corrections
}

/**
 * Use AI to extract a general learning rule from the correction.
 */
async function extractRuleFromCorrection(
  previousData: Record<string, unknown>,
  newData: Record<string, unknown>,
  editPrompt: string,
  corrections: Array<{ type: string; fieldPath: string; previousValue: string; newValue: string }>
): Promise<{ extractedRule: string; category: string; context: string; confidence: number } | null> {
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: CORRECTION_ANALYSIS_PROMPT,
      messages: [
        {
          role: "user",
          content: `EDIT INSTRUCTION: "${editPrompt}"

CORRECTIONS DETECTED:
${JSON.stringify(corrections, null, 2)}

BEFORE (summary):
- Total: $${(previousData as { totalAmount?: number }).totalAmount || 0}
- Items: ${((previousData as { lineItems?: unknown[] }).lineItems || []).length} line items

AFTER (summary):
- Total: $${(newData as { totalAmount?: number }).totalAmount || 0}
- Items: ${((newData as { lineItems?: unknown[] }).lineItems || []).length} line items

Extract a general rule the AI should learn from this correction.`,
        },
      ],
    })

    const textBlock = response.content.find((c) => c.type === "text")
    if (!textBlock || textBlock.type !== "text") return null

    let jsonText = textBlock.text.trim()
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }

    const parsed = JSON.parse(jsonText)
    const validated = correctionAnalysisSchema.parse(parsed)

    if (validated.confidence < 0.5) return null

    return validated
  } catch (err) {
    console.error("Rule extraction failed:", err)
    return null
  }
}

/**
 * Check if similar corrections exist and auto-promote to a training rule
 * when the threshold (3) is reached.
 */
async function checkAndPromote(
  userId: string,
  extractedRule: string,
  category: string
): Promise<void> {
  // Find similar corrections (case-insensitive, first 50 chars)
  const rulePrefix = extractedRule.substring(0, 50).toLowerCase()

  const allCorrections = await prisma.correctionLog.findMany({
    where: {
      userId,
      extractedRule: { not: null },
      promotedToRule: false,
    },
    select: {
      id: true,
      extractedRule: true,
      similarCount: true,
    },
  })

  const similar = allCorrections.filter(
    (c) =>
      c.extractedRule &&
      c.extractedRule.substring(0, 50).toLowerCase().includes(rulePrefix.substring(0, 30))
  )

  if (similar.length >= 3) {
    // Auto-promote to training rule
    const rule = await prisma.trainingRule.create({
      data: {
        userId,
        content: extractedRule,
        category,
        priority: "IMPORTANT",
        source: "CORRECTION",
        correctionLogId: similar[0].id,
      },
    })

    // Mark all similar corrections as promoted
    await prisma.correctionLog.updateMany({
      where: {
        id: { in: similar.map((s) => s.id) },
      },
      data: {
        promotedToRule: true,
        similarCount: similar.length,
      },
    })

    console.error(`Auto-promoted correction to training rule: ${rule.id}`)
  } else if (similar.length > 1) {
    // Update similar count on the latest
    await prisma.correctionLog.updateMany({
      where: {
        id: { in: similar.map((s) => s.id) },
      },
      data: {
        similarCount: similar.length,
      },
    })
  }
}
