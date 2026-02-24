import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { EDIT_SYSTEM_PROMPT, buildEditUserPrompt } from "./prompts"
import { editResponseSchema } from "@/lib/validations"
import type { EditResponse } from "@/types/estimate"

export async function editEstimate(
  currentEstimate: Record<string, unknown>,
  editInstruction: string,
  pricingDna?: Record<string, unknown> | null,
  systemPrompt?: string,
): Promise<EditResponse> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 8192,
    system: [
      {
        type: "text" as const,
        text: systemPrompt || EDIT_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildEditUserPrompt(currentEstimate, editInstruction, pricingDna),
      },
    ],
  })

  const textBlock = response.content.find((c) => c.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI")
  }

  let jsonText = textBlock.text.trim()
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  const parsed = JSON.parse(jsonText)
  const validated = editResponseSchema.parse(parsed)

  return validated as EditResponse
}
