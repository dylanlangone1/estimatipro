import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/health
 * Lightweight health check — tests DB connectivity only.
 * No auth required (used by uptime monitors), but exposes NO sensitive data.
 */
export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1")
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}
