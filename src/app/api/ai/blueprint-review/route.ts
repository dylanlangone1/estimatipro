import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { rateLimit } from "@/lib/rate-limit"
import { withRetry, LIGHT_RETRY } from "@/lib/ai/retry-utils"

// Blueprint review is a lightweight text-only call — 30s is sufficient
export const maxDuration = 60

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
        { error: "Blueprint AI review requires a Free Trial or Max plan." },
        { status: 403 }
      )
    }

    // Rate limit: 5 reviews per minute per user (same as blueprint-analyze)
    const { allowed } = rateLimit(`blueprint-review:${session.user.id}`, 5, 60_000)
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      )
    }

    const { message } = await req.json()
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const response = await withRetry(
      "blueprint-review",
      () => anthropic.messages.create(
        {
          model: AI_MODEL,
          max_tokens: 1024,
          system: `You are an expert residential construction estimator reviewing a material takeoff. Be direct, specific, and actionable. Focus on: missing materials, quantity errors, code compliance issues, duplicates, and anything an experienced builder would catch. Keep your response concise — 3-5 short paragraphs max.`,
          messages: [{ role: "user", content: message }],
        },
        { timeout: 30_000 }
      ),
      LIGHT_RETRY,
    )

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    return NextResponse.json({ answer: text })
  } catch (error) {
    console.error("[blueprint-review] error:", error)
    return NextResponse.json({ error: "AI review failed. Please try again." }, { status: 500 })
  }
}
