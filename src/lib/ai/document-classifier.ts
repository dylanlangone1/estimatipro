import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { DOCUMENT_CLASSIFY_PROMPT } from "./prompts"
import { documentClassificationSchema } from "@/lib/validations"

async function fetchFileBuffer(fileUrl: string): Promise<Buffer> {
  const url = fileUrl.startsWith("http")
    ? fileUrl
    : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${fileUrl}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
  return Buffer.from(await response.arrayBuffer())
}

async function fetchFileText(fileUrl: string): Promise<string> {
  const url = fileUrl.startsWith("http")
    ? fileUrl
    : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${fileUrl}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
  return response.text()
}

export async function classifyDocument(
  fileUrl: string,
  fileType: string
): Promise<{ documentType: string; confidence: number; reasoning: string }> {
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
      { type: "text", text: "Classify this document." },
    ]
  } else if (fileType === "pdf") {
    const fileBuffer = await fetchFileBuffer(fileUrl)
    const base64 = fileBuffer.toString("base64")
    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      { type: "text", text: "Classify this document." },
    ]
  } else {
    const textContent = await fetchFileText(fileUrl)
    content = [
      {
        type: "text",
        text: `Classify this document:\n\n${textContent.substring(0, 5000)}`,
      },
    ]
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 512,
    system: DOCUMENT_CLASSIFY_PROMPT,
    messages: [{ role: "user", content }],
  })

  const textBlock = response.content.find((c) => c.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    return { documentType: "unknown", confidence: 0, reasoning: "No AI response" }
  }

  let jsonText = textBlock.text.trim()
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  try {
    const parsed = JSON.parse(jsonText)
    return documentClassificationSchema.parse(parsed)
  } catch {
    return { documentType: "unknown", confidence: 0, reasoning: "Failed to parse classification" }
  }
}
