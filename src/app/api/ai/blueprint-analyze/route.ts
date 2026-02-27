import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { extractJson } from "@/lib/ai/json-utils"
import { rateLimit } from "@/lib/rate-limit"

// Typical response time after client-side resize: 8–20s; 60s is a safe ceiling
export const maxDuration = 60

const BLUEPRINT_PROMPT = `You are a residential construction estimator. Analyze this blueprint/floor plan.

Return ONLY valid JSON, no markdown or backticks:
{
  "totalSqft": <living area SF>,
  "stories": <1 or 2>,
  "bedrooms": <count>,
  "bathrooms": <decimal e.g. 2.5>,
  "garageSize": <0–3 cars>,
  "roofType": "<gable|hip|flat>",
  "foundationType": "<slab|crawl|basement>",
  "exteriorWallLF": <linear feet>,
  "interiorWallLF": <linear feet>,
  "ceilingHeight": <feet>,
  "windows": { "doubleHung": <n>, "sliding": <n>, "picture": <n> },
  "doors": { "exterior": <n>, "interior": <n> },
  "kitchenLF": <counter run LF>,
  "notes": "<special features>"
}

Every field is required. Estimate from context if a value is not explicit.`

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
      await requireFeature(session.user.id, "blueprintTakeoff")
    } catch {
      return NextResponse.json(
        { error: "Blueprint takeoff is available on the Free Trial and Max plans." },
        { status: 403 }
      )
    }

    // Rate limit: 5 blueprint analyses per minute per user
    const { allowed } = rateLimit(`blueprint:${session.user.id}`, 5, 60_000)
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
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
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [contentBlock, { type: "text", text: BLUEPRINT_PROMPT }],
          },
        ],
      },
      { timeout: 45_000 } // 45 s — well within maxDuration of 60 s
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
