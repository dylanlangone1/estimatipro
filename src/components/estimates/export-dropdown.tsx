"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import {
  Download,
  FileText,
  Palette,
  BookOpen,
  Pencil,
  Lock,
  ChevronDown,
  Users,
} from "lucide-react"
import type { SubscriptionTier } from "@/generated/prisma/client"

function tierAtLeast(userTier: SubscriptionTier, required: SubscriptionTier): boolean {
  const order: SubscriptionTier[] = ["FREE", "STANDARD", "PRO", "MAX"]
  return order.indexOf(userTier) >= order.indexOf(required)
}

interface ExportDropdownProps {
  estimateId: string
  userTier: SubscriptionTier
}

export function ExportDropdown({ estimateId, userTier }: ExportDropdownProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const canBranded = tierAtLeast(userTier, "PRO")
  const canProposal = tierAtLeast(userTier, "MAX")
  const isBusy = isDownloading || isGeneratingProposal

  /**
   * Download a PDF via fetch → blob → anchor click.
   * Using fetch instead of window.open() ensures:
   *  - Errors surface as toast messages instead of raw JSON in a new tab
   *  - Popup blockers cannot interfere
   *  - The file is saved with the correct filename
   */
  async function downloadPdf(url: string, filename: string) {
    setIsDownloading(true)
    setIsOpen(false)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || `PDF generation failed (${res.status})`)
      }
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      toast({
        title: "PDF download failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  function handleClientPdf() {
    downloadPdf(`/api/pdf/${estimateId}?type=client`, "Client Estimate.pdf")
  }

  function handleStandardPdf() {
    downloadPdf(`/api/pdf/${estimateId}?type=standard`, "Estimate.pdf")
  }

  function handleBrandedPdf() {
    if (!canBranded) {
      toast({
        title: "Pro plan required",
        description: "Upgrade to Pro to export branded PDFs with your logo and colors.",
        variant: "warning",
      })
      return
    }
    downloadPdf(`/api/pdf/${estimateId}?type=branded`, "Branded Estimate.pdf")
  }

  async function handleProposalPdf() {
    if (!canProposal) {
      toast({
        title: "Max plan required",
        description: "Upgrade to Max to generate full 7-page proposals.",
        variant: "warning",
      })
      return
    }
    setIsGeneratingProposal(true)
    setIsOpen(false)

    try {
      // Pre-generate proposal data
      const res = await fetch("/api/ai/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error || "Failed to generate proposal")
      }

      // Download the proposal PDF via the same fetch→blob pattern
      await downloadPdf(`/api/pdf/${estimateId}?type=proposal`, "Proposal.pdf")
    } catch (err) {
      toast({
        title: "Proposal generation failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsGeneratingProposal(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isBusy}
      >
        {isGeneratingProposal ? (
          <>
            <Spinner size="sm" className="mr-1.5" />
            Generating...
          </>
        ) : isDownloading ? (
          <>
            <Spinner size="sm" className="mr-1.5" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1.5" />
            Export
            <ChevronDown className="h-3 w-3 ml-1" />
          </>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-card border border-card-border rounded-xl shadow-lg z-20 py-1 animate-fade-in">
          {/* Client Estimate — recommended, all tiers */}
          <button
            onClick={handleClientPdf}
            disabled={isBusy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-card-border/20 transition-colors text-left disabled:opacity-50"
          >
            <Users className="h-4 w-4 text-brand-orange shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Client Estimate</p>
              <p className="text-xs text-muted">Professional, client-ready PDF</p>
            </div>
          </button>

          {/* Standard PDF */}
          <button
            onClick={handleStandardPdf}
            disabled={isBusy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-card-border/20 transition-colors text-left disabled:opacity-50"
          >
            <FileText className="h-4 w-4 text-muted shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Standard PDF</p>
              <p className="text-xs text-muted">Internal detail estimate</p>
            </div>
          </button>

          {/* Branded PDF */}
          <button
            onClick={handleBrandedPdf}
            disabled={isBusy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-card-border/20 transition-colors text-left disabled:opacity-50"
          >
            <Palette className="h-4 w-4 text-brand-orange shrink-0" />
            <div className="flex-1">
              <p className="font-medium flex items-center gap-2">
                Branded PDF
                {!canBranded && <Lock className="h-3 w-3 text-muted" />}
              </p>
              <p className="text-xs text-muted">With your logo &amp; brand colors</p>
            </div>
            {!canBranded && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                PRO
              </Badge>
            )}
          </button>

          {/* Full Proposal */}
          <button
            onClick={handleProposalPdf}
            disabled={isBusy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-card-border/20 transition-colors text-left disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4 text-brand-orange shrink-0" />
            <div className="flex-1">
              <p className="font-medium flex items-center gap-2">
                Full Proposal
                {!canProposal && <Lock className="h-3 w-3 text-muted" />}
              </p>
              <p className="text-xs text-muted">7-page document with scope &amp; timeline</p>
            </div>
            {!canProposal && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                MAX
              </Badge>
            )}
          </button>

          {/* Divider */}
          <div className="border-t border-card-border my-1" />

          {/* Edit Proposal */}
          <button
            onClick={() => {
              if (!canProposal) {
                toast({
                  title: "Max plan required",
                  description: "Upgrade to Max to create and edit proposals.",
                  variant: "warning",
                })
                return
              }
              setIsOpen(false)
              router.push(`/estimate/${estimateId}/proposal`)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-card-border/20 transition-colors text-left"
          >
            <Pencil className="h-4 w-4 text-brand-orange shrink-0" />
            <div className="flex-1">
              <p className="font-medium flex items-center gap-2">
                Edit Proposal
                {!canProposal && <Lock className="h-3 w-3 text-muted" />}
              </p>
              <p className="text-xs text-muted">Customize before downloading</p>
            </div>
            {!canProposal && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                MAX
              </Badge>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
