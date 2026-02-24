import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/estimates/:id
 * Inline-edit estimate fields: title, description, and line items.
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

    const { id } = await params
    const body = await req.json()

    // Verify ownership
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      select: { userId: true, subtotal: true, markupPercent: true, taxAmount: true },
    })

    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Build update payload — only update fields that are provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const estimateUpdate: Record<string, any> = {}

    if (typeof body.title === "string" && body.title.trim()) {
      estimateUpdate.title = body.title.trim()
    }

    if (typeof body.description === "string") {
      estimateUpdate.description = body.description.trim()
    }

    // Update estimate-level fields
    if (Object.keys(estimateUpdate).length > 0) {
      await prisma.estimate.update({
        where: { id },
        data: estimateUpdate,
      })
    }

    // Update individual line items
    if (Array.isArray(body.lineItems)) {
      for (const item of body.lineItems) {
        if (!item.id) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lineUpdate: Record<string, any> = {}

        if (typeof item.description === "string") {
          lineUpdate.description = item.description.trim()
        }
        if (typeof item.quantity === "number" && item.quantity >= 0) {
          lineUpdate.quantity = item.quantity
        }
        if (typeof item.unitCost === "number" && item.unitCost >= 0) {
          lineUpdate.unitCost = item.unitCost
        }
        if (typeof item.unit === "string") {
          lineUpdate.unit = item.unit.trim()
        }

        // Recalculate totalCost if quantity or unitCost changed
        if (lineUpdate.quantity !== undefined || lineUpdate.unitCost !== undefined) {
          // Fetch current item to get existing values
          const current = await prisma.lineItem.findUnique({
            where: { id: item.id },
            select: { quantity: true, unitCost: true, estimateId: true },
          })
          if (current && current.estimateId === id) {
            const qty = lineUpdate.quantity ?? current.quantity
            const cost = lineUpdate.unitCost ?? current.unitCost
            lineUpdate.totalCost = qty * cost
          }
        }

        if (Object.keys(lineUpdate).length > 0) {
          await prisma.lineItem.update({
            where: { id: item.id },
            data: lineUpdate,
          })
        }
      }

      // Recalculate estimate totals
      const allItems = await prisma.lineItem.findMany({
        where: { estimateId: id },
        select: { totalCost: true },
      })

      const newSubtotal = allItems.reduce((sum, item) => sum + item.totalCost, 0)
      const markupAmount = newSubtotal * (estimate.markupPercent / 100)
      const totalAmount = newSubtotal + markupAmount + estimate.taxAmount

      await prisma.estimate.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          markupAmount,
          totalAmount,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Estimate update error:", error)
    return NextResponse.json(
      { error: "Failed to update estimate" },
      { status: 500 }
    )
  }
}
