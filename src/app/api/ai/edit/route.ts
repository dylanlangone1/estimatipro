import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { editEstimate } from "@/lib/ai/estimate-editor"
import { editEstimateInputSchema } from "@/lib/validations"
import { loadTrainingContext } from "@/lib/ai/training-context-loader"
import { buildEnhancedSystemPrompt, EDIT_SYSTEM_PROMPT } from "@/lib/ai/prompts"
import { analyzeCorrectionAndLearn } from "@/lib/ai/correction-learning-engine"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    let input
    try {
      input = editEstimateInputSchema.parse(body)
    } catch {
      return NextResponse.json(
        { error: "Invalid edit request. Please provide an estimate ID and edit prompt." },
        { status: 400 }
      )
    }

    // Fetch current estimate with line items
    const currentEstimate = await prisma.estimate.findUnique({
      where: { id: input.estimateId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    })

    if (!currentEstimate || currentEstimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Fetch pricing DNA and training context in parallel
    const [pricingProfile, trainingContext] = await Promise.all([
      prisma.pricingProfile.findFirst({
        where: { userId: session.user.id },
      }),
      loadTrainingContext(session.user.id, currentEstimate.description),
    ])

    // Build enhanced edit system prompt
    const enhancedPrompt = buildEnhancedSystemPrompt(EDIT_SYSTEM_PROMPT, {
      trainingRules: trainingContext.trainingRules,
      contextRules: trainingContext.mergedContext,
      recentCorrections: trainingContext.recentCorrections,
    })

    // Build current estimate data for the AI
    const estimateData = {
      title: currentEstimate.title,
      lineItems: currentEstimate.lineItems.map((item) => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        laborCost: item.laborCost,
        materialCost: item.materialCost,
        markupPercent: item.markupPercent,
      })),
      subtotal: currentEstimate.subtotal,
      markupPercent: currentEstimate.markupPercent,
      markupAmount: currentEstimate.markupAmount,
      totalAmount: currentEstimate.totalAmount,
    }

    // Snapshot previous state
    const previousData = JSON.parse(JSON.stringify(estimateData))

    // Call AI to edit with enhanced prompt
    const editResponse = await editEstimate(
      estimateData,
      input.prompt,
      pricingProfile?.profileData as Record<string, unknown> | null,
      enhancedPrompt,
    )

    const updated = editResponse.updatedEstimate

    // Save changes in a transaction
    await prisma.$transaction(async (tx) => {
      // Create edit history
      await tx.editHistory.create({
        data: {
          estimateId: input.estimateId,
          editPrompt: input.prompt,
          changesMade: JSON.parse(JSON.stringify(editResponse.changes)),
          previousData,
          newData: JSON.parse(JSON.stringify(updated)),
        },
      })

      // Delete old line items
      await tx.lineItem.deleteMany({
        where: { estimateId: input.estimateId },
      })

      // Create new line items
      if (updated.lineItems.length > 0) {
        await tx.lineItem.createMany({
          data: updated.lineItems.map((item, index) => ({
            estimateId: input.estimateId,
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            laborCost: item.laborCost,
            materialCost: item.materialCost,
            markupPercent: item.markupPercent,
            sortOrder: index,
          })),
        })
      }

      // Compute markup amount server-side to avoid AI omitting it
      const computedMarkupAmount =
        updated.suggestedMarkupAmount > 0
          ? updated.suggestedMarkupAmount
          : updated.subtotal * (updated.suggestedMarkupPercent / 100)

      // Update estimate totals
      await tx.estimate.update({
        where: { id: input.estimateId },
        data: {
          title: updated.title,
          subtotal: updated.subtotal,
          markupPercent: updated.suggestedMarkupPercent,
          markupAmount: computedMarkupAmount,
          taxAmount: updated.suggestedTax,
          totalAmount: updated.totalAmount,
        },
      })
    })

    // Fire-and-forget: analyze correction and auto-learn
    analyzeCorrectionAndLearn(
      session.user.id,
      input.estimateId,
      previousData,
      JSON.parse(JSON.stringify(updated)),
      input.prompt
    ).catch((err) => console.error("Correction learning error:", err))

    return NextResponse.json({
      success: true,
      changes: editResponse.changes,
    })
  } catch (error) {
    console.error("Estimate edit error:", error)
    return NextResponse.json(
      { error: "Failed to edit estimate. Please try again." },
      { status: 500 }
    )
  }
}
