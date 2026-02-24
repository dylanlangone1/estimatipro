import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature, checkLimit } from "@/lib/tiers"
import { put } from "@vercel/blob"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Require historicalUpload feature (STANDARD+)
    try {
      await requireFeature(session.user.id, "historicalUpload")
    } catch {
      return NextResponse.json(
        { error: "Document uploads require a Standard plan or higher." },
        { status: 403 }
      )
    }

    // Check monthly upload limit
    const limitCheck = await checkLimit(session.user.id, "uploadsPerMonth")
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `You've reached your monthly upload limit (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan for more.`,
        },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const allowedTypes = ["pdf", "csv", "xlsx", "xls", "docx", "jpg", "jpeg", "png"]
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    // Upload to Vercel Blob (production) or save locally (dev fallback)
    const blobName = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    let fileUrl: string

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(blobName, file, { access: "public" })
      fileUrl = blob.url
    } else {
      // Local dev fallback
      const fs = await import("fs/promises")
      const path = await import("path")
      const uploadsDir = path.join(process.cwd(), "public", "uploads")
      await fs.mkdir(uploadsDir, { recursive: true })
      const filePath = path.join(uploadsDir, blobName.replace("uploads/", ""))
      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.writeFile(filePath, buffer)
      fileUrl = `/uploads/${blobName.replace("uploads/", "")}`
    }

    // Create database record
    const doc = await prisma.uploadedDocument.create({
      data: {
        userId: session.user.id,
        filename: file.name,
        fileType: ext,
        fileUrl,
        fileSize: file.size,
        parseStatus: "PENDING",
      },
    })

    return NextResponse.json({ id: doc.id, filename: doc.filename, fileUrl: doc.fileUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const docs = await prisma.uploadedDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(docs)
  } catch (error) {
    console.error("Fetch uploads error:", error)
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 })
  }
}
