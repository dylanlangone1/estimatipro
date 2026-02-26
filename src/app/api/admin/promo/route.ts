import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Admin endpoint to create and list promo codes.
 * Protected by Authorization: Bearer <ADMIN_SECRET>
 *
 * POST /api/admin/promo
 * { "code": "BLUECOLLAR", "maxUses": 50, "expiresAt": "2026-12-31" }
 *
 * GET /api/admin/promo
 * Returns all promo codes with usage stats.
 */

function checkAuth(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const { code, maxUses, expiresAt } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "code is required." }, { status: 400 })
    }

    const normalizedCode = code.trim().toUpperCase()

    const promoCode = await prisma.promoCode.create({
      data: {
        code: normalizedCode,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json(promoCode, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A promo code with that name already exists." }, { status: 409 })
    }
    console.error("[admin/promo] POST error:", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const codes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(codes)
  } catch (error) {
    console.error("[admin/promo] GET error:", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
