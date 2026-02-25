import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { DOCUMENT_PARSE_SYSTEM_PROMPT } from "./prompts"
import { fetchBlobBuffer, fetchBlobText } from "./blob-fetch"
import { extractJson } from "./json-utils"

const fetchFileBuffer = fetchBlobBuffer
const fetchFileText = fetchBlobText

export async function parseDocument(fileUrl: string, fileType: string) {
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
      { type: "text", text: "Extract all pricing data from this construction document image." },
    ]
  } else if (fileType === "pdf") {
    const fileBuffer = await fetchFileBuffer(fileUrl)
    const base64 = fileBuffer.toString("base64")
    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      { type: "text", text: "Extract all pricing data from this construction document." },
    ]
  } else {
    const textContent = await fetchFileText(fileUrl)
    content = [
      { type: "text", text: `Extract all pricing data from this construction document:\n\n${textContent}` },
    ]
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 8192,
    system: DOCUMENT_PARSE_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  })

  const textBlock = response.content.find((c) => c.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI")
  }

  const jsonText = extractJson(textBlock.text)

  try {
    return JSON.parse(jsonText)
  } catch (parseErr) {
    console.error("[document-parser] JSON.parse failed:", textBlock.text.slice(0, 300))
    throw new Error(
      `Document parsing failed: AI returned invalid JSON. ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
    )
  }
}
