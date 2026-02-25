import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { ESTIMATE_SYSTEM_PROMPT, buildEstimateUserPrompt } from "./prompts"
import { estimateResponseSchema } from "@/lib/validations"
import { extractJson } from "./json-utils"
import type { AIEstimateResponse } from "@/types/estimate"

export async function generateEstimate(
  description: string,
  pricingDna?: Record<string, unknown> | null,
  trades?: string[],
  materialPrices?: Array<{ materialName: string; avgUnitPrice: number; unit: string; lastUnitPrice: number }>,
  systemPrompt?: string,
  qualityLevel?: string,
  brandContext?: string,
): Promise<AIEstimateResponse> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    system: [
      {
        type: "text" as const,
        text: systemPrompt || ESTIMATE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildEstimateUserPrompt(description, pricingDna, trades, materialPrices, qualityLevel, brandContext),
      },
    ],
  })

  if (response.stop_reason === "max_tokens") {
    throw new Error("AI response was too large and got cut off. Try a more specific description or break the project into phases.")
  }

  const textBlock = response.content.find((c) => c.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI")
  }

  const rawText = textBlock.text
  const jsonText = extractJson(rawText)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (parseErr) {
    // Log truncated raw response for debugging — never log the full system prompt
    const preview = rawText.slice(0, 500)
    console.error("[estimate-generator] JSON.parse failed. Raw response preview:", preview)
    throw new Error(
      `AI returned invalid JSON. Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
    )
  }

  let validated: AIEstimateResponse
  try {
    validated = estimateResponseSchema.parse(parsed) as AIEstimateResponse
  } catch (zodErr) {
    // Surface Zod validation errors clearly
    console.error("[estimate-generator] Zod validation failed:", zodErr)
    throw new Error(
      `AI response failed validation: ${zodErr instanceof Error ? zodErr.message : String(zodErr)}`
    )
  }

  return validated
}
