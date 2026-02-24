import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"

/**
 * PATCH /api/estimates/[id]/contract
 * Toggle contract mode on an estimate. Requires PRO+ tier.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requireFeature(session.user.id, "contractMode")

    const { id } = await params
    const { isContract } = await req.json()

    if (typeof isContract !== "boolean") {
      return NextResponse.json({ error: "isContract must be a boolean" }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.estimate.update({
      where: { id },
      data: { isContract },
    })

    return NextResponse.json({ success: true, isContract })
  } catch (error) {
    console.error("Contract toggle error:", error)
    if (error instanceof Error && error.name === "TierError") {
      return NextResponse.json(
        { error: "Contract mode requires a Pro plan or higher." },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: "Failed to toggle contract mode" }, { status: 500 })
  }
}
