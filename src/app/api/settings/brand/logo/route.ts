import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import { put } from "@vercel/blob"

/**
 * POST /api/settings/brand/logo
 * Dedicated logo upload endpoint — separate from document uploads.
 * - Checks logoUpload feature (PRO+), NOT historicalUpload
 * - Does NOT count against monthly upload limits
 * - Does NOT create uploadedDocument records
 * - Accepts image files only (png, jpg, jpeg, webp, svg)
 * - Max 2MB
 * - Saves URL directly to user.logoUrl
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "logoUpload")
    } catch {
      return NextResponse.json(
        { error: "Logo upload requires a Pro plan or higher." },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate image type
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    const allowedImageTypes = ["png", "jpg", "jpeg", "webp", "svg"]
    if (!allowedImageTypes.includes(ext)) {
      return NextResponse.json(
        { error: "Please upload an image file (PNG, JPG, WEBP, or SVG)" },
        { status: 400 }
      )
    }

    // 2MB limit for logos
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Logo must be under 2MB" },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    const blobName = `logos/${session.user.id}-${Date.now()}.${ext}`

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "File storage not configured" },
        { status: 500 }
      )
    }

    const blob = await put(blobName, file, { access: "public" })

    // Save URL directly to user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: { logoUrl: blob.url },
    })

    return NextResponse.json({ logoUrl: blob.url })
  } catch (error) {
    console.error("Logo upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logo upload failed" },
      { status: 500 }
    )
  }
}
