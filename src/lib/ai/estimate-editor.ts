import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { EDIT_SYSTEM_PROMPT, buildEditUserPrompt } from "./prompts"
import { editResponseSchema } from "@/lib/validations"
import type { EditResponse } from "@/types/estimate"
import { extractJson } from "./json-utils"
import { withRetry } from "./retry-utils"

export async function editEstimate(
  currentEstimate: Record<string, unknown>,
  editInstruction: string,
  pricingDna?: Record<string, unknown> | null,
  systemPrompt?: string,
): Promise<EditResponse> {
  return withRetry("estimate-editor", () =>
    runEdit(currentEstimate, editInstruction, pricingDna, systemPrompt)
  )
}

async function runEdit(
  currentEstimate: Record<string, unknown>,
  editInstruction: string,
  pricingDna?: Record<string, unknown> | null,
  systemPrompt?: string,
): Promise<EditResponse> {
  const response = await anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: 32000,
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
  }).finalMessage()

  if (response.stop_reason === "max_tokens") {
    throw new Error("AI response was too large and got cut off. Try a simpler edit or break it into smaller changes.")
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
    const preview = rawText.slice(0, 500)
    console.error("[estimate-editor] JSON.parse failed. Raw response preview:", preview)
    throw new Error(
      `AI returned invalid JSON. Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
    )
  }

  let validated: EditResponse
  try {
    validated = editResponseSchema.parse(parsed) as EditResponse
  } catch (zodErr) {
    console.error("[estimate-editor] Zod validation failed:", zodErr)
    throw new Error(
      `AI response failed validation: ${zodErr instanceof Error ? zodErr.message : String(zodErr)}`
    )
  }

  return validated
}
