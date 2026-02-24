import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/tiers"
import { anthropic, AI_MODEL } from "@/lib/anthropic"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "brandedPdf")
    } catch {
      return NextResponse.json(
        { error: "Branded templates require a Pro plan or higher." },
        { status: 403 }
      )
    }

    const { brandColors, companyName, tagline, trades } = await req.json()

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a professional PDF template designer for construction estimates and proposals.

Design a professional, branded PDF template configuration for this company:
- Company Name: ${companyName || "Not provided"}
- Tagline: ${tagline || "Not provided"}
- Brand Colors: Primary ${brandColors?.primary || "#E94560"}, Secondary ${brandColors?.secondary || "#1A1A2E"}, Accent ${brandColors?.accent || "#16213E"}
- Trades: ${trades?.join(", ") || "General contractor"}

Return ONLY a JSON object with this exact structure, no other text:
{
  "header": {
    "logoPosition": "left",
    "showTagline": true,
    "borderStyle": "accent",
    "bgColor": "${brandColors?.primary || "#E94560"}"
  },
  "body": {
    "fontFamily": "Helvetica",
    "alternateRowBg": true,
    "categoryStyle": "banner"
  },
  "totals": {
    "style": "boxed",
    "highlightColor": "${brandColors?.primary || "#E94560"}"
  },
  "footer": {
    "showGeneratedBy": true,
    "customText": ""
  },
  "colors": {
    "primary": "${brandColors?.primary || "#E94560"}",
    "secondary": "${brandColors?.secondary || "#1A1A2E"}",
    "accent": "${brandColors?.accent || "#16213E"}",
    "text": "#1F2937",
    "background": "#FFFFFF"
  }
}

Guidelines:
- Use the brand colors creatively but professionally
- "bgColor" should be the primary brand color for a strong header
- "highlightColor" should make totals stand out
- Choose "banner" categoryStyle for bold brands, "underline" for minimal brands
- Choose "boxed" totals for premium feel, "minimal" for clean look
- If the trades suggest rugged/construction work, use bolder styles
- If trades suggest precision work (electrical, plumbing), use cleaner styles
- The footer customText could include a tagline or "Licensed & Insured" if appropriate
- Make text color readable against the background`,
        },
      ],
    })

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse template response")
    }

    const templateConfig = JSON.parse(jsonMatch[0])

    // Deactivate previous templates and save the new one
    await prisma.brandTemplate.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { isActive: false },
    })

    await prisma.brandTemplate.create({
      data: {
        userId: session.user.id,
        name: "AI Designed",
        isActive: true,
        templateConfig,
      },
    })

    return NextResponse.json(templateConfig)
  } catch (error) {
    console.error("Template design error:", error)
    return NextResponse.json(
      { error: "Failed to design template" },
      { status: 500 }
    )
  }
}
