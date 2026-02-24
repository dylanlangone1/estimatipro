import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { markupPercent } = await req.json()

    if (typeof markupPercent !== "number" || isNaN(markupPercent) || markupPercent < 0 || markupPercent > 100) {
      return NextResponse.json({ error: "Invalid markup percentage" }, { status: 400 })
    }

    // Fetch estimate and verify ownership
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      select: { userId: true, subtotal: true, taxAmount: true },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Compute new values
    const markupAmount = estimate.subtotal * (markupPercent / 100)
    const totalAmount = estimate.subtotal + markupAmount + estimate.taxAmount

    // Save
    await prisma.estimate.update({
      where: { id },
      data: { markupPercent, markupAmount, totalAmount },
    })

    return NextResponse.json({ markupPercent, markupAmount, totalAmount })
  } catch (error) {
    console.error("Markup update error:", error)
    return NextResponse.json({ error: "Failed to update markup" }, { status: 500 })
  }
}
