import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { extractJson } from "@/lib/ai/json-utils"

// PDFs with many pages can take 2–5 min; raise timeout accordingly
export const maxDuration = 300

const BLUEPRINT_PROMPT = `You are an expert residential construction estimator. Analyze this blueprint/floor plan image or PDF.

Return ONLY a valid JSON object with no markdown, no backticks, no preamble:
{
  "totalSqft": <total living area in square feet as a number>,
  "stories": <number of stories, 1 or 2>,
  "bedrooms": <number of bedrooms>,
  "bathrooms": <bathrooms as decimal, e.g. 2.5 for 2 full + 1 half>,
  "garageSize": <0=none, 1=one car, 2=two car, 3=three car>,
  "roofType": "<gable|hip|flat>",
  "foundationType": "<slab|crawl|basement>",
  "exteriorWallLF": <linear feet of exterior walls>,
  "interiorWallLF": <linear feet of interior walls>,
  "ceilingHeight": <typical ceiling height in feet>,
  "windows": { "doubleHung": <count>, "sliding": <count>, "picture": <count> },
  "doors": { "exterior": <count>, "interior": <count> },
  "kitchenLF": <linear feet of kitchen counter run>,
  "notes": "<any special features or observations>"
}

Be as accurate as possible from the drawing. If a value cannot be determined, use a reasonable estimate for a typical home of the apparent size. Every field must have a value.`

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const
type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "historicalUpload")
    } catch {
      return NextResponse.json(
        { error: "Blueprint AI analysis requires a Standard plan or higher." },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 10MB for blueprint analysis." }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const isPDF = file.type === "application/pdf" || ext === "pdf"
    if (!isPDF && !isAllowedImageType(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, JPG, PNG, or WEBP." }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")

    const contentBlock = isPDF
      ? ({
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
        })
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type as AllowedImageType,
            data: base64,
          },
        })

    const response = await anthropic.messages.create(
      {
        model: AI_MODEL,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [contentBlock, { type: "text", text: BLUEPRINT_PROMPT }],
          },
        ],
      },
      { timeout: 280_000 } // 280 s — just under Vercel maxDuration of 300 s
    )

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(extractJson(text))
    } catch {
      return NextResponse.json({ error: "Could not parse AI response. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error("Blueprint analysis error:", error)
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Blueprint analysis failed: ${msg.slice(0, 100)}` }, { status: 500 })
  }
}
