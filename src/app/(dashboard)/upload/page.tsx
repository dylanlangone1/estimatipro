"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Upload, FileText, CheckCircle, XCircle, Clock, Loader2, Trash2, RotateCw } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface UploadedDoc {
  id: string
  filename: string
  fileType: string
  fileSize: number
  parseStatus: string
  documentType: string | null
  createdAt: string
}

const statusConfig: Record<string, { variant: "default" | "success" | "warning" | "error" | "info"; icon: typeof Clock }> = {
  PENDING: { variant: "default", icon: Clock },
  PROCESSING: { variant: "info", icon: Loader2 },
  COMPLETED: { variant: "success", icon: CheckCircle },
  FAILED: { variant: "error", icon: XCircle },
}

export default function UploadPage() {
  const [documents, setDocuments] = useState<UploadedDoc[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDocuments()
  }, [])

  // Poll for updates when documents are processing
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.parseStatus === "PROCESSING")
    if (!hasProcessing) return
    const interval = setInterval(fetchDocuments, 3000)
    return () => clearInterval(interval)
  }, [documents])

  async function fetchDocuments() {
    const res = await fetch("/api/uploads")
    if (res.ok) {
      const data = await res.json()
      setDocuments(data)
    }
  }

  async function retryDocument(docId: string) {
    setRetryingIds((prev) => new Set(prev).add(docId))
    // Optimistically update status to PROCESSING
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, parseStatus: "PROCESSING" } : d))
    )
    try {
      await fetch("/api/ai/parse-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      })
    } catch (err) {
      console.error("Retry failed:", err)
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev)
        next.delete(docId)
        return next
      })
      // Refresh after a short delay to get updated status
      setTimeout(fetchDocuments, 2000)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true)
    setUploadError(null)

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Upload failed")
        }

        const doc = await res.json()

        // Trigger parsing (fire-and-forget with error handling)
        fetch("/api/ai/parse-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: doc.id }),
        }).catch((parseErr) => {
          console.error("Document parsing trigger failed:", parseErr)
        })
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed")
      }
    }

    setIsUploading(false)
    // Refresh the list
    setTimeout(fetchDocuments, 1000)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 10 * 1024 * 1024,
  })

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Upload Portal
        </h1>
        <p className="text-muted mt-1">
          Upload anything — estimates, invoices, supplier receipts, plans, photos.
          The AI auto-classifies each document and extracts pricing data to make your estimates smarter.
        </p>
      </div>

      {/* Dropzone */}
      <Card>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-brand-orange bg-brand-orange/5"
                : "border-card-border hover:border-brand-orange/50"
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-foreground font-medium">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-muted" />
                <div>
                  <p className="text-foreground font-medium">
                    {isDragActive ? "Drop files here" : "Drag & drop files here, or click to browse"}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    PDF, Excel, Word, CSV, or Images up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>
          {uploadError && (
            <p className="text-sm text-error mt-3">{uploadError}</p>
          )}
        </CardContent>
      </Card>

      {/* Document List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Uploaded Documents</h2>
              <div className="flex items-center gap-3">
                {documents.filter((d) => d.parseStatus === "FAILED").length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      documents
                        .filter((d) => d.parseStatus === "FAILED")
                        .forEach((d) => retryDocument(d.id))
                    }}
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1" />
                    Retry All Failed
                  </Button>
                )}
                <span className="text-sm text-muted">{documents.length} documents</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-card-border">
              {documents.map((doc) => {
                const status = statusConfig[doc.parseStatus] || statusConfig.PENDING
                return (
                  <div key={doc.id} className="flex items-center gap-4 px-6 py-4">
                    <FileText className="h-8 w-8 text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.filename}</p>
                      <p className="text-sm text-muted">
                        {formatFileSize(doc.fileSize)} &middot; {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    {doc.documentType && (
                      <Badge variant={
                        doc.documentType === "estimate" || doc.documentType === "client_invoice"
                          ? "success"
                          : doc.documentType === "supplier_invoice"
                          ? "info"
                          : "default"
                      }>
                        {doc.documentType === "supplier_invoice" ? "Supplier Invoice"
                          : doc.documentType === "client_invoice" ? "Client Invoice"
                          : doc.documentType === "estimate" ? "Estimate"
                          : doc.documentType === "plan" ? "Plan"
                          : doc.documentType === "photo" ? "Photo"
                          : doc.documentType}
                      </Badge>
                    )}
                    <Badge variant={status.variant}>{doc.parseStatus}</Badge>
                    {doc.parseStatus === "FAILED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryDocument(doc.id)}
                        disabled={retryingIds.has(doc.id)}
                        className="shrink-0"
                      >
                        <RotateCw className={`h-3.5 w-3.5 mr-1 ${retryingIds.has(doc.id) ? "animate-spin" : ""}`} />
                        Retry
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No documents uploaded yet. Start uploading to build your Pricing DNA.</p>
        </div>
      )}
    </div>
  )
}
