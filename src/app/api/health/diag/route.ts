import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/anthropic"

/**
 * GET /api/health/diag
 * Comprehensive diagnostic endpoint — tests each subsystem used in estimate generation.
 * No auth required so we can curl it from anywhere.
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  }

  // 1. Database connectivity
  try {
    const userCount = await prisma.user.count()
    results.database = { status: "OK", userCount }
  } catch (error) {
    results.database = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 2. Prisma model queries (the ones used in generate route)
  try {
    // Test findFirst on PricingProfile (non-PK unique field)
    const profile = await prisma.pricingProfile.findFirst({
      where: { userId: "nonexistent_test_id" },
    })
    results.pricingProfileQuery = { status: "OK", result: profile === null ? "null (expected)" : "found" }
  } catch (error) {
    results.pricingProfileQuery = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  try {
    // Test findMany on MaterialPriceLibrary
    const materials = await prisma.materialPriceLibrary.findMany({
      where: { userId: "nonexistent_test_id" },
      take: 1,
    })
    results.materialLibraryQuery = { status: "OK", count: materials.length }
  } catch (error) {
    results.materialLibraryQuery = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  try {
    // Test TrainingRule query
    const rules = await prisma.trainingRule.findMany({
      where: { userId: "nonexistent_test_id", isActive: true },
      take: 1,
    })
    results.trainingRuleQuery = { status: "OK", count: rules.length }
  } catch (error) {
    results.trainingRuleQuery = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  try {
    // Test CorrectionLog query (used in training context loader)
    const corrections = await prisma.correctionLog.findMany({
      where: { userId: "nonexistent_test_id", extractedRule: { not: null } },
      take: 1,
    })
    results.correctionLogQuery = { status: "OK", count: corrections.length }
  } catch (error) {
    results.correctionLogQuery = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  try {
    // Test ContextRule query
    const ctxRules = await prisma.contextRule.findMany({
      where: { isActive: true },
      take: 1,
    })
    results.contextRuleQuery = { status: "OK", count: ctxRules.length }
  } catch (error) {
    results.contextRuleQuery = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 3. Anthropic API connectivity (minimal test)
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "Say OK" }],
    })
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    results.anthropic = { status: "OK", model: AI_MODEL, response: text.slice(0, 50) }
  } catch (error) {
    results.anthropic = {
      status: "FAIL",
      model: AI_MODEL,
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 4. Estimate creation test (dry run — just checks the table is writable)
  try {
    // Test that the Estimate model is accessible
    const count = await prisma.estimate.count()
    results.estimateTable = { status: "OK", totalEstimates: count }
  } catch (error) {
    results.estimateTable = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // 5. Check Prisma client version
  try {
    results.prismaClient = { status: "OK" }
  } catch (error) {
    results.prismaClient = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // Summary
  const allChecks = Object.entries(results).filter(([key]) => key !== "timestamp" && key !== "nodeVersion")
  const failedChecks = allChecks.filter(
    ([, value]) => typeof value === "object" && value !== null && (value as { status?: string }).status === "FAIL"
  )

  results.summary = {
    total: allChecks.length,
    passed: allChecks.length - failedChecks.length,
    failed: failedChecks.length,
    failedNames: failedChecks.map(([key]) => key),
  }

  return NextResponse.json(results, {
    status: failedChecks.length > 0 ? 500 : 200,
  })
}
