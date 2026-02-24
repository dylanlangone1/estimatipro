import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/anthropic"

/**
 * POST — AI parses a user's finish level description into structured data.
 * PUT  — Saves finalized finish levels to user record.
 * GET  — Returns saved finish levels.
 */

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== "string" || prompt.length < 10) {
      return NextResponse.json(
        { error: "Please describe your finish levels in detail (at least 10 characters)." },
        { status: 400 }
      )
    }

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a construction estimating assistant. A contractor is describing their custom quality/finish levels for their business. Parse their description into structured finish level data.

CONTRACTOR'S DESCRIPTION:
"${prompt}"

Generate 2-5 finish levels from their description. Each level should include:
- name: Short name (e.g., "Budget", "Standard", "Premium", "Luxury")
- description: One sentence explaining this quality tier
- materialExamples: 3-5 example materials/brands at this tier
- priceMultiplier: A multiplier relative to standard (standard = 1.0, budget = 0.7-0.85, premium = 1.3-1.6, luxury = 1.8-2.5+)

Return ONLY a JSON array, no other text:
[
  {
    "name": "Budget",
    "description": "Builder-grade materials with basic finishes",
    "materialExamples": ["Laminate countertops", "LVP flooring", "Basic fixtures"],
    "priceMultiplier": 0.75
  }
]`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Could not parse finish levels response")
    }

    const levels = JSON.parse(jsonMatch[0])

    return NextResponse.json({ levels })
  } catch (error) {
    console.error("Finish levels generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate finish levels" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { levels } = await req.json()
    if (!Array.isArray(levels) || levels.length === 0) {
      return NextResponse.json(
        { error: "At least one finish level is required" },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { customFinishLevels: JSON.parse(JSON.stringify(levels)) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Finish levels save error:", error)
    return NextResponse.json(
      { error: "Failed to save finish levels" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { customFinishLevels: true },
    })

    return NextResponse.json({ levels: user?.customFinishLevels || null })
  } catch (error) {
    console.error("Finish levels fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch finish levels" },
      { status: 500 }
    )
  }
}
