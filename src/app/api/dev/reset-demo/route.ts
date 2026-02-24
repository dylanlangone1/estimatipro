import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  // Only allow in local development — blocked on production AND preview deployments
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: "demo@estimaipro.com" },
    })

    if (!user) {
      return NextResponse.json({ message: "No demo user found — will be created fresh on next login" })
    }

    // Get all estimate IDs for cascading deletes
    const estimates = await prisma.estimate.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    const estimateIds = estimates.map((e) => e.id)

    // Delete all related data
    if (estimateIds.length > 0) {
      await prisma.lineItem.deleteMany({ where: { estimateId: { in: estimateIds } } })
      await prisma.editHistory.deleteMany({ where: { estimateId: { in: estimateIds } } })
      await prisma.estimate.deleteMany({ where: { userId: user.id } })
    }

    await prisma.uploadedDocument.deleteMany({ where: { userId: user.id } })
    await prisma.supplierInvoice.deleteMany({ where: { userId: user.id } })
    await prisma.trainingRule.deleteMany({ where: { userId: user.id } })
    await prisma.correctionLog.deleteMany({ where: { userId: user.id } })
    await prisma.pricingProfile.deleteMany({ where: { userId: user.id } })
    await prisma.materialPriceLibrary.deleteMany({ where: { userId: user.id } })
    await prisma.brandTemplate.deleteMany({ where: { userId: user.id } })
    await prisma.client.deleteMany({ where: { userId: user.id } })

    // Delete sessions and accounts
    await prisma.session.deleteMany({ where: { userId: user.id } })
    await prisma.account.deleteMany({ where: { userId: user.id } })

    // Delete the user entirely — will be recreated on next demo login
    await prisma.user.delete({ where: { id: user.id } })

    return NextResponse.json({
      message: "Demo account fully reset. Sign in again to get a fresh account.",
      deletedEstimates: estimateIds.length,
    })
  } catch (error) {
    console.error("Demo reset error:", error)
    return NextResponse.json({ error: "Failed to reset demo" }, { status: 500 })
  }
}
