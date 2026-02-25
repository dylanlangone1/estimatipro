import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { SUPPLIER_INVOICE_PARSE_PROMPT } from "./prompts"
import { supplierInvoiceResponseSchema } from "@/lib/validations"
import type { z } from "zod/v4"

export type SupplierInvoiceParseResult = z.infer<typeof supplierInvoiceResponseSchema>

import { fetchBlobBuffer, fetchBlobText } from "./blob-fetch"

const fetchFileBuffer = fetchBlobBuffer
const fetchFileText = fetchBlobText

export async function parseSupplierInvoice(
  fileUrl: string,
  fileType: string
): Promise<SupplierInvoiceParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let content: any[]

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileType.toLowerCase())) {
    const fileBuffer = await fetchFileBuffer(fileUrl)
    const base64 = fileBuffer.toString("base64")
    const mediaType = fileType === "jpg" || fileType === "jpeg" ? "image/jpeg" : `image/${fileType}`
    content = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      },
      { type: "text", text: "Extract all line items and pricing from this supplier invoice." },
    ]
  } else if (fileType === "pdf") {
    const fileBuffer = await fetchFileBuffer(fileUrl)
    const base64 = fileBuffer.toString("base64")
    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      { type: "text", text: "Extract all line items and pricing from this supplier invoice." },
    ]
  } else {
    const textContent = await fetchFileText(fileUrl)
    content = [
      {
        type: "text",
        text: `Extract all line items and pricing from this supplier invoice:\n\n${textContent}`,
      },
    ]
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 8192,
    system: SUPPLIER_INVOICE_PARSE_PROMPT,
    messages: [{ role: "user", content }],
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
  return supplierInvoiceResponseSchema.parse(parsed)
}
