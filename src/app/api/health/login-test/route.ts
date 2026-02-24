import { NextResponse } from "next/server"
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

  // Step 2: Find user by email
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (user) {
      steps.step2_findUser = {
        status: "FOUND",
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      }
    } else {
      steps.step2_findUser = { status: "NOT_FOUND" }

      // Step 3: Try creating user
      try {
        const newUser = await prisma.user.create({
          data: {
            email: email.toLowerCase().trim(),
            name: email.split("@")[0],
            tier: "FREE",
          },
        })
        steps.step3_createUser = {
          status: "CREATED",
          id: newUser.id,
          email: newUser.email,
        }
      } catch (error) {
        steps.step3_createUser = {
          status: "ERROR",
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  } catch (error) {
    steps.step2_findUser = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // Step 4: List all users
  try {
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, tier: true },
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
