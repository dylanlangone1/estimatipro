import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/tiers"
import { classifyDocument } from "@/lib/ai/document-classifier"
import { parseDocument } from "@/lib/ai/document-parser"
import { parseSupplierInvoice } from "@/lib/ai/supplier-invoice-parser"
import { updateMaterialLibrary } from "@/lib/ai/material-library-engine"
import { recalculatePricingDNA } from "@/lib/ai/pricing-dna-engine"

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
        { error: "Document parsing requires a Standard plan or higher." },
        { status: 403 }
      )
    }

    const { documentId } = await req.json()

    const doc = await prisma.uploadedDocument.findUnique({
      where: { id: documentId },
    })

    if (!doc || doc.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Step 1: Set status to PROCESSING
    await prisma.uploadedDocument.update({
      where: { id: documentId },
      data: { parseStatus: "PROCESSING" },
    })

    try {
      // Step 2: Classify the document
      const classification = await classifyDocument(doc.fileUrl, doc.fileType)
      console.error(`Document ${documentId} classified as: ${classification.documentType} (${classification.confidence})`)

      // Step 3: Update document with classification
      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: { documentType: classification.documentType },
      })

      // Step 4: Route to appropriate parser
      if (classification.documentType === "estimate" || classification.documentType === "client_invoice") {
        // Use existing estimate parser
        const parsed = await parseDocument(doc.fileUrl, doc.fileType)

        await prisma.uploadedDocument.update({
          where: { id: documentId },
          data: {
            parseStatus: "COMPLETED",
            parsedData: JSON.parse(JSON.stringify(parsed)),
            extractedLineItems: parsed.extractedLineItems
              ? JSON.parse(JSON.stringify(parsed.extractedLineItems))
              : undefined,
            extractedMarkups: parsed.detectedMarkups
              ? JSON.parse(JSON.stringify(parsed.detectedMarkups))
              : undefined,
            projectType: parsed.projectType || null,
            processedAt: new Date(),
          },
        })

        // Recalculate Pricing DNA
        await recalculatePricingDNA(session.user.id)
      } else if (classification.documentType === "supplier_invoice") {
        // Parse as supplier invoice
        const invoiceData = await parseSupplierInvoice(doc.fileUrl, doc.fileType)

        // Create SupplierInvoice record with items
        const invoice = await prisma.supplierInvoice.create({
          data: {
            userId: session.user.id,
            filename: doc.filename,
            fileType: doc.fileType,
            fileUrl: doc.fileUrl,
            fileSize: doc.fileSize,
            supplierName: invoiceData.supplierName,
            invoiceDate: invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : null,
            invoiceNumber: invoiceData.invoiceNumber || null,
            subtotal: invoiceData.subtotal || null,
            taxAmount: invoiceData.taxAmount || null,
            totalAmount: invoiceData.totalAmount || null,
            parseStatus: "COMPLETED",
            processedAt: new Date(),
            items: {
              create: invoiceData.items.map((item) => ({
                itemDescription: item.itemDescription,
                category: item.category || "Other",
                sku: item.sku || null,
                quantity: item.quantity || 1,
                unit: item.unit || "ea",
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                normalizedName: item.normalizedName || null,
                normalizedUnit: item.normalizedUnit || null,
                normalizedUnitPrice: item.normalizedUnitPrice || null,
              })),
            },
          },
        })

        // Update the uploaded document
        await prisma.uploadedDocument.update({
          where: { id: documentId },
          data: {
            parseStatus: "COMPLETED",
            parsedData: JSON.parse(JSON.stringify(invoiceData)),
            extractedLineItems: JSON.parse(JSON.stringify(invoiceData.items)),
            extractedTotals: JSON.parse(
              JSON.stringify({
                subtotal: invoiceData.subtotal,
                tax: invoiceData.taxAmount,
                total: invoiceData.totalAmount,
              })
            ),
            processedAt: new Date(),
          },
        })

        // Update material library from this invoice
        await updateMaterialLibrary(session.user.id, invoice.id)

        // Recalculate Pricing DNA
        await recalculatePricingDNA(session.user.id)
      } else {
        // plan, photo, unknown — mark completed with notes
        await prisma.uploadedDocument.update({
          where: { id: documentId },
          data: {
            parseStatus: "COMPLETED",
            parsedData: JSON.parse(
              JSON.stringify({
                documentType: classification.documentType,
                reasoning: classification.reasoning,
                note: "Document classified but no pricing data extracted.",
              })
            ),
            processedAt: new Date(),
          },
        })
      }

      return NextResponse.json({
        success: true,
        documentType: classification.documentType,
        confidence: classification.confidence,
      })
    } catch (parseError) {
      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: {
          parseStatus: "FAILED",
          parseErrors: parseError instanceof Error ? parseError.message : "Unknown error",
        },
      })
      throw parseError
    }
  } catch (error) {
    console.error("Document parsing error:", error)
    return NextResponse.json({ error: "Failed to parse document" }, { status: 500 })
  }
}
