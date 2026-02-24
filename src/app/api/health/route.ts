import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? "SET" : "MISSING",
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ? "SET" : "MISSING",
      AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "MISSING",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "SET" : "MISSING",
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "SET" : "MISSING",
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY
        ? "SET"
        : "MISSING",
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN
        ? "SET"
        : "MISSING",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "SET" : "MISSING",
    },
  }

  // Test database
  try {
    const userCount = await prisma.user.count()
    checks.database = { status: "OK", userCount }
  } catch (error) {
    checks.database = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  // Test auth
  try {
    const session = await auth()
    checks.auth = {
      status: "OK",
      hasSession: !!session,
      user: session?.user?.email || null,
    }
  } catch (error) {
    checks.auth = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    }
  }

  const allOk =
    checks.database &&
    (checks.database as { status: string }).status === "OK" &&
    checks.auth &&
    (checks.auth as { status: string }).status === "OK"

  return NextResponse.json(checks, { status: allOk ? 200 : 500 })
}
