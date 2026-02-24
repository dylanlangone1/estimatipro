import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateEstimate } from "@/lib/ai/estimate-generator"
import { generateEstimateInputSchema } from "@/lib/validations"
import { loadTrainingContext } from "@/lib/ai/training-context-loader"
import { buildEnhancedSystemPrompt, ESTIMATE_SYSTEM_PROMPT } from "@/lib/ai/prompts"
import { validateEstimateCoherence } from "@/lib/ai/coherence-engine"
import { checkLimit } from "@/lib/tiers"
import { buildDescriptionFromGuided, buildDescriptionFromManual } from "@/lib/ai/description-builder"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user still exists (handles stale JWT sessions after account reset)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })
    if (!userExists) {
      return NextResponse.json(
        { error: "Session expired. Please sign out and sign back in." },
        { status: 401 }
      )
    }

    // Check monthly estimate limit
    const limitCheck = await checkLimit(session.user.id, "estimatesPerMonth")
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `You've reached your monthly estimate limit (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan for more.`,
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    // Backward compat: default mode to "ai" for old clients
    if (!body.mode) {
      body.mode = "ai"
    }

    let input
    try {
      input = generateEstimateInputSchema.parse(body)
    } catch {
      return NextResponse.json(
        { error: "Please provide a valid project description (at least 10 characters)." },
        { status: 400 }
      )
    }

    // Resolve description, trades, and quality level based on input mode
    let description: string
    let tradesOverride: string[] | undefined
    let qualityLevel: string | undefined

    // Extract location from payload (optional, all modes)
    const location = body.location?.trim() || ""

    if (input.mode === "guided") {
      description = buildDescriptionFromGuided(input)
      tradesOverride = input.trades
      qualityLevel = input.qualityLevel
    } else if (input.mode === "manual") {
      description = buildDescriptionFromManual(input)
      tradesOverride = input.trades
      qualityLevel = input.qualityLevel
    } else {
      description = input.description
    }

    // Append location context for permit cost intelligence
    if (location) {
      description += `\n\nPROJECT LOCATION: ${location}. PERMITS: Research actual permit costs for ${location}. Include building permit, trade permits (electrical, plumbing, mechanical), and any local impact/development fees. If exact costs are known for this jurisdiction, use them as specific dollar amounts rather than percentages. Otherwise estimate based on regional averages for this area.`
    } else {
      description += `\n\nPERMIT NOTE: No project location specified. Use 1-3% of project cost as permit allowance, minimum $500.`
    }

    // Fetch user's pricing DNA, trades, material prices, and training context in parallel
    const [pricingProfile, user, materialLibrary, trainingContext] = await Promise.all([
      prisma.pricingProfile.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { trades: true },
      }),
      prisma.materialPriceLibrary.findMany({
        where: { userId: session.user.id },
        orderBy: { priceCount: "desc" },
        take: 20,
        select: {
          materialName: true,
          avgUnitPrice: true,
          lastUnitPrice: true,
          unit: true,
        },
      }),
      loadTrainingContext(session.user.id, description),
    ])

    // Build enhanced system prompt with training rules + context rules
    const enhancedPrompt = buildEnhancedSystemPrompt(ESTIMATE_SYSTEM_PROMPT, {
      trainingRules: trainingContext.trainingRules,
      contextRules: trainingContext.mergedContext,
      recentCorrections: trainingContext.recentCorrections,
    })

    // Generate the estimate via AI with all context
    // Use tradesOverride from guided/manual modes, or fall back to user profile trades
    const aiResponse = await generateEstimate(
      description,
      pricingProfile?.profileData as Record<string, unknown> | null,
      tradesOverride ?? user?.trades,
      materialLibrary.length > 0 ? materialLibrary : undefined,
      enhancedPrompt,
      qualityLevel,
    )

    // Run coherence check against context rules
    const coherenceResult = validateEstimateCoherence(
      aiResponse,
      trainingContext.matchedContextRules
    )

    // Merge coherence warnings into deviation alerts
    const allAlerts = [...aiResponse.deviationAlerts]
    if (!coherenceResult.passed) {
      for (const warning of coherenceResult.warnings) {
        allAlerts.push({
          lineItem: "",
          alert: `[Context Check] ${warning.message}`,
          severity: warning.severity === "error" ? "critical" : "warning",
        })
      }
    }

    // Compute markup amount server-side to avoid AI omitting it
    const computedMarkupAmount =
      aiResponse.suggestedMarkupAmount > 0
        ? aiResponse.suggestedMarkupAmount
        : aiResponse.subtotal * (aiResponse.suggestedMarkupPercent / 100)

    // Save to database in a transaction
    const estimate = await prisma.$transaction(async (tx) => {
      const est = await tx.estimate.create({
        data: {
          userId: session.user.id,
          clientId: input.clientId || null,
          title: aiResponse.title,
          description,
          projectType: aiResponse.projectType,
          subtotal: aiResponse.subtotal,
          markupPercent: aiResponse.suggestedMarkupPercent,
          markupAmount: computedMarkupAmount,
          taxAmount: aiResponse.suggestedTax,
          totalAmount: aiResponse.totalAmount,
          aiGenerated: true,
          aiModel: "claude-sonnet-4-20250514",
          assumptions: JSON.parse(JSON.stringify(aiResponse.assumptions)),
          deviationAlerts: allAlerts.length > 0
            ? JSON.parse(JSON.stringify(allAlerts))
            : undefined,
          confidenceScore: 0.85,
        },
      })

      // Create all line items
      if (aiResponse.lineItems.length > 0) {
        await tx.lineItem.createMany({
          data: aiResponse.lineItems.map((item, index) => ({
            estimateId: est.id,
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

      return est
    })

    // Fire-and-forget: increment timesApplied on training rules that were used
    if (trainingContext.trainingRules.length > 0) {
      prisma.trainingRule
        .updateMany({
          where: {
            userId: session.user.id,
            isActive: true,
          },
          data: {
            timesApplied: { increment: 1 },
          },
        })
        .catch((err) => console.error("Failed to increment timesApplied:", err))
    }

    // Fire-and-forget: save preferences for guided/manual modes
    if (input.mode === "guided" || input.mode === "manual") {
      prisma.user
        .update({
          where: { id: session.user.id },
          data: {
            estimatePreferences: {
              lastTrades: input.trades,
              lastProjectType: input.projectType,
              lastQualityLevel: input.qualityLevel,
            },
          },
        })
        .catch((err) => console.error("Failed to save preferences:", err))
    }

    return NextResponse.json({
      id: estimate.id,
      ...aiResponse,
      deviationAlerts: allAlerts,
    })
  } catch (error) {
    console.error("Estimate generation error:", error)

    return NextResponse.json(
      { error: "Failed to generate estimate. Please try again." },
      { status: 500 }
    )
  }
}
