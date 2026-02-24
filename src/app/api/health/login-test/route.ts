import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = url.searchParams.get("email") || "dylan@estimaipro.com"

  const steps: Record<string, unknown> = { email }

  // Step 1: Test basic DB query
  try {
    const count = await prisma.user.count()
    steps.step1_count = { status: "OK", count }
  } catch (error) {
    steps.step1_count = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    }
    return NextResponse.json(steps, { status: 500 })
  }

  // Step 2: Find user by email using findFirst
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
    })
    if (user) {
      steps.step2_findUser = {
        status: "FOUND",
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        hasPassword: !!user.password,
      }

      // Step 3: Test password verification
      if (user.password) {
        const testMatch = await bcrypt.compare("EstimAI2024!", user.password)
        steps.step3_passwordTest = {
          status: testMatch ? "MATCH" : "NO_MATCH",
        }
      } else {
        steps.step3_passwordTest = { status: "NO_PASSWORD_SET" }
      }
    } else {
      steps.step2_findUser = { status: "NOT_FOUND" }
    }
  } catch (error) {
    steps.step2_findUser = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // Step 4: List all users (basic info)
  try {
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, tier: true, password: false },
    })
    steps.step4_allUsers = allUsers
  } catch (error) {
    steps.step4_allUsers = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  return NextResponse.json(steps)
}
