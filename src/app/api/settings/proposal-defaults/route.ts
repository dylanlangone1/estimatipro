import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"

/**
 * GET /api/settings/proposal-defaults
 * Returns the user's saved proposal defaults (About Us, timeline template, warranty, exclusions).
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "fullProposals")
    } catch {
      return NextResponse.json({ error: "Requires Max plan" }, { status: 403 })
    }

    const defaults = await prisma.proposalDefaults.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      aboutUs: defaults?.aboutUs || "",
      timelineTemplate: defaults?.timelineTemplate || [],
      warranty: defaults?.warranty || "",
      exclusions: defaults?.exclusions || "",
    })
  } catch (error) {
    console.error("Proposal defaults GET error:", error)
    return NextResponse.json({ error: "Failed to load proposal defaults" }, { status: 500 })
  }
}

/**
 * PATCH /api/settings/proposal-defaults
 * Upserts the user's proposal defaults. Accepts partial updates (only the fields provided are saved).
 *
 * Body: { aboutUs?, timelineTemplate?, warranty?, exclusions? }
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "fullProposals")
    } catch {
      return NextResponse.json({ error: "Requires Max plan" }, { status: 403 })
    }

    const body = await req.json()
    const { aboutUs, timelineTemplate, warranty, exclusions } = body

    // Build upsert — only include explicitly provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}
    if (aboutUs !== undefined) updateData.aboutUs = aboutUs || null
    if (timelineTemplate !== undefined) updateData.timelineTemplate = timelineTemplate || []
    if (warranty !== undefined) updateData.warranty = warranty || null
    if (exclusions !== undefined) updateData.exclusions = exclusions || null

    await prisma.proposalDefaults.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Proposal defaults PATCH error:", error)
    return NextResponse.json({ error: "Failed to save proposal defaults" }, { status: 500 })
  }
}
