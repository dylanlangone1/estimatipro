import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod/v4"

const profileUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  licenseNumber: z.string().max(50).optional(),
  websiteUrl: z.string().max(500).optional(),
  tagline: z.string().max(200).optional(),
})

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    let data
    try {
      data = profileUpdateSchema.parse(body)
    } catch {
      return NextResponse.json(
        { error: "Invalid profile data. Please check your inputs." },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name || undefined,
        companyName: data.companyName || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip: data.zip || undefined,
        licenseNumber: data.licenseNumber || undefined,
        websiteUrl: data.websiteUrl || undefined,
        tagline: data.tagline || undefined,
      },
      select: {
        name: true,
        email: true,
        companyName: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        licenseNumber: true,
        websiteUrl: true,
        tagline: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
