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

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (err) {
      console.error("FormData parse error:", err)
      return NextResponse.json({ error: "Failed to parse uploaded file." }, { status: 400 })
    }

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
      try {
        const blob = await put(blobName, file, { access: "private" })
        fileUrl = blob.url
      } catch (err) {
        console.error("Blob upload error:", err)
        const detail = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: `File storage failed: ${detail}` }, { status: 500 })
      }
    } else {
      // Local dev fallback
      try {
        const fs = await import("fs/promises")
        const path = await import("path")
        const uploadsDir = path.join(process.cwd(), "public", "uploads")
        await fs.mkdir(uploadsDir, { recursive: true })
        const filePath = path.join(uploadsDir, blobName.replace("uploads/", ""))
        const buffer = Buffer.from(await file.arrayBuffer())
        await fs.writeFile(filePath, buffer)
        fileUrl = `/uploads/${blobName.replace("uploads/", "")}`
      } catch (err) {
        console.error("Local file write error:", err)
        return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured." }, { status: 500 })
      }
    }

    // Create database record
    let doc: { id: string; filename: string; fileUrl: string }
    try {
      doc = await prisma.uploadedDocument.create({
        data: {
          userId: session.user.id,
          filename: file.name,
          fileType: ext,
          fileUrl,
          fileSize: file.size,
          parseStatus: "PENDING",
        },
        select: { id: true, filename: true, fileUrl: true },
      })
    } catch (err) {
      console.error("DB create error:", err)
      const detail = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Database error: ${detail}` }, { status: 500 })
    }

    return NextResponse.json({ id: doc.id, filename: doc.filename, fileUrl: doc.fileUrl })
  } catch (error) {
    console.error("Upload error:", error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const docs = await prisma.uploadedDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(docs)
  } catch (error) {
    console.error("Fetch uploads error:", error)
    return NextResponse.json({ error: "Failed to fetch uploads" }, { status: 500 })
  }
}
