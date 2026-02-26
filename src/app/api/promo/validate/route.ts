import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Public endpoint for live promo code validation on the registration form.
 *
 * GET /api/promo/validate?code=BLUECOLLAR
 * → { valid: true,  message: "30-day free trial — no card required!" }
 * → { valid: false, message: "Invalid or expired promo code." }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ valid: false, message: "No code provided." })
  }

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { code },
    })

    if (!promo) {
      return NextResponse.json({ valid: false, message: "Invalid promo code." })
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, message: "This promo code has expired." })
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ valid: false, message: "This promo code has reached its maximum uses." })
    }

    return NextResponse.json({
      valid: true,
      message: "30-day free trial — full access, no card required!",
    })
  } catch (error) {
    console.error("[promo/validate] error:", error)
    return NextResponse.json({ valid: false, message: "Unable to validate code. Please try again." })
  }
}
