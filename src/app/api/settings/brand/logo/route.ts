import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"

/**
 * POST /api/settings/brand/logo
 * Dedicated logo upload endpoint.
 * Converts image to base64 data URI and stores directly in user.logoUrl.
 * No Vercel Blob dependency — works regardless of store config.
 * Base64 also eliminates CORS issues in @react-pdf/renderer.
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

    // Convert to base64 data URI — stored directly in DB
    // This bypasses Vercel Blob entirely and eliminates CORS issues in PDFs
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml",
    }
    const contentType = mimeTypes[ext] || "image/png"
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUri = `data:${contentType};base64,${base64}`

    // Save base64 data URI directly to user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: { logoUrl: dataUri },
    })

    return NextResponse.json({ logoUrl: dataUri })
  } catch (error) {
    console.error("Logo upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logo upload failed" },
      { status: 500 }
    )
  }
}
