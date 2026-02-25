"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Camera, Link2, Loader2, CheckCircle, X } from "lucide-react"
import Image from "next/image"

interface EstimateMaxActionsProps {
  estimateId: string
  projectPhotoUrl: string | null
  stripePaymentLink: string | null
  stripeConnected: boolean
}

export function EstimateMaxActions({
  estimateId,
  projectPhotoUrl: initialPhotoUrl,
  stripePaymentLink: initialPaymentLink,
  stripeConnected,
}: EstimateMaxActionsProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [paymentLink, setPaymentLink] = useState<string | null>(initialPaymentLink)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "error" })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 10MB.", variant: "error" })
      return
    }

    setUploadingPhoto(true)
    try {
      // Get a Vercel Blob upload URL (reuse existing upload endpoint)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("estimateId", estimateId)

      const res = await fetch(`/api/estimates/${estimateId}/project-photo`, {
        method: "POST",
        body: formData,
      })
      const result = await res.json()

      if (!res.ok || result.error) {
        throw new Error(result.error || "Upload failed")
      }

      setPhotoUrl(result.url)
      toast({ title: "Project photo uploaded", description: "It will appear on your proposal cover page.", variant: "success" })
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setUploadingPhoto(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleRemovePhoto() {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/project-photo`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to remove photo")
      setPhotoUrl(null)
      toast({ title: "Project photo removed", variant: "success" })
    } catch (err) {
      toast({
        title: "Failed to remove photo",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      })
    }
  }

  async function handleGeneratePaymentLink() {
    setGeneratingLink(true)
    try {
      const res = await fetch(`/api/invoices/${estimateId}/payment-link`, { method: "POST" })
      const result = await res.json()

      if (!res.ok || result.error) throw new Error(result.error || "Failed to generate link")

      setPaymentLink(result.url)
      toast({
        title: "Payment link created!",
        description: "It will appear on the Invoice page of your Final Proposal.",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Failed to generate payment link",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setGeneratingLink(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Project Photo */}
      {photoUrl ? (
        <div className="flex items-center gap-1.5">
          <div className="relative h-7 w-10 overflow-hidden rounded border border-card-border">
            <Image src={photoUrl} alt="Project" fill className="object-cover" />
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">Cover photo</span>
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Remove project photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="h-8 text-xs"
            title="Add a project photo for the proposal cover page"
          >
            {uploadingPhoto ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="mr-1.5 h-3.5 w-3.5" />
            )}
            {uploadingPhoto ? "Uploading…" : "Cover Photo"}
          </Button>
        </>
      )}

      {/* Payment Link */}
      {paymentLink ? (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(paymentLink)
              toast({ title: "Payment link copied!", variant: "success" })
            }}
            className="text-xs text-primary hover:underline truncate max-w-[140px]"
            title={paymentLink}
          >
            Payment link
          </button>
        </div>
      ) : stripeConnected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeneratePaymentLink}
          disabled={generatingLink}
          className="h-8 text-xs"
          title="Generate a Stripe payment link for this invoice"
        >
          {generatingLink ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          {generatingLink ? "Generating…" : "Payment Link"}
        </Button>
      ) : null}
    </div>
  )
}
