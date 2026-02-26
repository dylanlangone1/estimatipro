import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { name, email, password, promoCode } = await request.json()

    // Validate inputs
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: emailLower },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        password: hashedPassword,
        tier: "FREE",
      },
    })

    // Apply promo code if provided — grants 30-day MAX trial, no card required
    let trialActivated = false
    if (promoCode && typeof promoCode === "string") {
      const code = promoCode.trim().toUpperCase()
      try {
        const promo = await prisma.promoCode.findUnique({ where: { code } })

        const isValid =
          promo &&
          (promo.expiresAt === null || promo.expiresAt > new Date()) &&
          (promo.maxUses === null || promo.usedCount < promo.maxUses)

        if (isValid) {
          const trialEndsAt = new Date()
          trialEndsAt.setDate(trialEndsAt.getDate() + 30)

          await prisma.$transaction([
            prisma.promoCode.update({
              where: { code },
              data: { usedCount: { increment: 1 } },
            }),
            prisma.user.update({
              where: { id: user.id },
              data: { trialEndsAt, promoCodeUsed: code },
            }),
          ])
          trialActivated = true
          console.log(`[register] Promo code "${code}" applied to user ${user.id} — trial ends ${trialEndsAt.toISOString()}`)
        } else {
          console.warn(`[register] Promo code "${code}" was invalid or maxed out for user ${user.id} — account created on FREE`)
        }
      } catch (promoErr) {
        // Never fail registration because of a promo code error — just log it
        console.error("[register] Promo code application error:", promoErr)
      }
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        userId: user.id,
        trialActivated,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
