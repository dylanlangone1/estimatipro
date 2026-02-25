import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import { put } from "@vercel/blob"

/**
 * POST /api/estimates/[id]/project-photo
 * Upload a project photo for the proposal cover page.
 * Stores in Vercel Blob and saves URL to estimate.projectPhotoUrl.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await requireFeature(session.user.id, "fullProposals")
    } catch {
      return NextResponse.json({ error: "Requires Max plan" }, { status: 403 })
    }

    const { id } = await params

    // Verify ownership
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const blobName = `project-photos/${session.user.id}/${id}-${Date.now()}.${ext}`
    let photoUrl: string

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(blobName, file, { access: "public" })
      photoUrl = blob.url
    } else {
      // Local dev fallback
      const fs = await import("fs/promises")
      const path = await import("path")
      const dir = path.join(process.cwd(), "public", "uploads", "project-photos")
      await fs.mkdir(dir, { recursive: true })
      const fileName = `${id}-${Date.now()}.${ext}`
      const filePath = path.join(dir, fileName)
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)
      photoUrl = `/uploads/project-photos/${fileName}`
    }

    // Save to estimate
    await prisma.estimate.update({
      where: { id },
      data: { projectPhotoUrl: photoUrl },
    })

    return NextResponse.json({ url: photoUrl })
  } catch (error) {
    console.error("Project photo upload error:", error)
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 })
  }
}

/**
 * DELETE /api/estimates/[id]/project-photo
 * Remove the project photo from an estimate.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!estimate || estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.estimate.update({
      where: { id },
      data: { projectPhotoUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Project photo delete error:", error)
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 })
  }
}
