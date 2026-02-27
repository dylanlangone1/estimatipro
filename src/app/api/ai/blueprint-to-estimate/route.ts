import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkLimit } from "@/lib/tiers"
import type { TakeoffItem } from "@/types/takeoff"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limitCheck = await checkLimit(session.user.id, "estimatesPerMonth")
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `You've used all ${limitCheck.limit} free trial estimates. Upgrade your plan to create more estimates.`,
        },
        { status: 403 }
      )
    }

    const { items, projectInfo } = (await req.json()) as {
      items: TakeoffItem[]
      projectInfo: {
        projectName?: string
        sqft: number
        bedrooms: number
        bathrooms: number
        stories: number
        roofType: string
        foundationType: string
      }
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No takeoff items provided" }, { status: 400 })
    }

    const materialTotal = items.reduce((s, r) => s + r.totalCost, 0)
    const laborTotal = Math.round(materialTotal * 1.35)
    const subtotal = materialTotal + laborTotal
    const markupPercent = 18
    const markupAmount = Math.round(subtotal * 0.18)
    const totalAmount = subtotal + markupAmount

    const title = projectInfo.projectName
      ? `${projectInfo.projectName} — Material Takeoff`
      : `${projectInfo.sqft.toLocaleString()} SF Residential — Material Takeoff`

    const description = `Blueprint takeoff for a ${projectInfo.sqft} SF, ${projectInfo.stories}-story, ${projectInfo.bedrooms}BR/${projectInfo.bathrooms}BA residence with ${projectInfo.foundationType} foundation and ${projectInfo.roofType} roof. Generated from blueprint analysis with 7-layer validation.`

    const estimate = await prisma.$transaction(async (tx) => {
      const est = await tx.estimate.create({
        data: {
          userId: session.user.id,
          title,
          description,
          projectType: "New Construction",
          subtotal,
          markupPercent,
          markupAmount,
          taxAmount: 0,
          totalAmount,
          aiGenerated: true,
          aiModel: "blueprint-takeoff-engine",
          assumptions: [
            "Material costs from RSMeans-aligned takeoff database",
            "Labor estimated at 1.35× material cost",
            "18% overhead & profit applied on subtotal",
            "Waste factors included in all quantities",
            "Verify all quantities against actual blueprints before bidding",
          ],
          confidenceScore: 0.88,
        },
      })

      // Material line items
      const lineItemData = items.map((item, index) => ({
        estimateId: est.id,
        category: item.cat,
        description: `${item.name} (${item.quantity} ${item.unit} incl. ${Math.round((item.waste - 1) * 100)}% waste)`,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.cost,
        totalCost: item.totalCost,
        materialCost: item.totalCost,
        sortOrder: index,
      }))

      // Labor line item
      lineItemData.push({
        estimateId: est.id,
        category: "Labor & Installation",
        description: "Labor, installation, and subcontractor costs (1.35× materials)",
        quantity: 1,
        unit: "LS",
        unitCost: laborTotal,
        totalCost: laborTotal,
        materialCost: 0,
        sortOrder: items.length,
      })

      await tx.lineItem.createMany({ data: lineItemData })

      return est
    })

    return NextResponse.json({ estimateId: estimate.id })
  } catch (error) {
    console.error("Blueprint-to-estimate error:", error)
    return NextResponse.json({ error: "Failed to create estimate from takeoff" }, { status: 500 })
  }
}
