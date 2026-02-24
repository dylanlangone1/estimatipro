import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { ESTIMATE_SYSTEM_PROMPT, buildEstimateUserPrompt } from "./prompts"
import { estimateResponseSchema } from "@/lib/validations"
import type { AIEstimateResponse } from "@/types/estimate"

export async function generateEstimate(
  description: string,
  pricingDna?: Record<string, unknown> | null,
  trades?: string[],
  materialPrices?: Array<{ materialName: string; avgUnitPrice: number; unit: string; lastUnitPrice: number }>,
  systemPrompt?: string,
  qualityLevel?: string,
): Promise<AIEstimateResponse> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 8192,
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
        content: buildEstimateUserPrompt(description, pricingDna, trades, materialPrices, qualityLevel),
      },
    ],
  })

  const textBlock = response.content.find((c) => c.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI")
  }

  // Clean the response - sometimes the AI wraps in code fences
  let jsonText = textBlock.text.trim()
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  const parsed = JSON.parse(jsonText)
  const validated = estimateResponseSchema.parse(parsed)

  return validated as AIEstimateResponse
}
