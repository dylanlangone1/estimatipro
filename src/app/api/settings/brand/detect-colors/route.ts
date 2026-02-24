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

    await requireFeature(session.user.id, "logoUpload")

    const { logoUrl } = await req.json()
    if (!logoUrl) {
      return NextResponse.json({ error: "Logo URL required" }, { status: 400 })
    }

    // Fetch logo from URL (Vercel Blob or local)
    const fetchUrl = logoUrl.startsWith("http") ? logoUrl : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${logoUrl}`
    const logoResponse = await fetch(fetchUrl)
    if (!logoResponse.ok) throw new Error("Could not fetch logo")
    const arrayBuffer = await logoResponse.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    // Determine media type from extension
    const ext = logoUrl.split(".").pop()?.toLowerCase() || "png"
    const mediaTypeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    }
    const mediaType = (mediaTypeMap[ext] || "image/png") as "image/jpeg" | "image/png" | "image/gif" | "image/webp"

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `Analyze this company logo. Extract the 3 most prominent colors used in the logo.
Return ONLY a JSON object with exactly this format, no other text:
{"primary": "#hex", "secondary": "#hex", "accent": "#hex"}

- primary: The dominant/main brand color
- secondary: The second most prominent color
- accent: A complementary color or the third most prominent color

If the logo is mostly one color, generate harmonious secondary and accent colors that complement it.`,
            },
          ],
        },
      ],
    })

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse color response")
    }

    const colors = JSON.parse(jsonMatch[0])

    // Save to user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: { brandColors: colors },
    })

    return NextResponse.json(colors)
  } catch (error) {
    console.error("Color detection error:", error)
    return NextResponse.json(
      { error: "Failed to detect colors" },
      { status: 500 }
    )
  }
}
