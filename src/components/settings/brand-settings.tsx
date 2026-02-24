"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import { updateLogoUrl, updateBrandColors, saveTemplate } from "@/actions/settings-actions"
import {
  Image as ImageIcon,
  Palette,
  Sparkles,
  Upload,
  Building,
  ExternalLink,
  Check,
} from "lucide-react"
import Link from "next/link"
import type { BrandColors, TemplateConfig } from "@/types/proposal"

interface BrandSettingsProps {
  user: {
    logoUrl: string | null
    brandColors: BrandColors | null
    companyName: string | null
    tagline: string | null
    phone: string | null
    address: string | null
    trades: string[]
  }
  activeTemplate: {
    id: string
    name: string
    templateConfig: TemplateConfig
  } | null
}

export function BrandSettings({ user, activeTemplate }: BrandSettingsProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState(user.logoUrl)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [brandColors, setBrandColors] = useState<BrandColors>(
    user.brandColors || { primary: "#E94560", secondary: "#1A1A2E", accent: "#16213E" }
  )
  const [isDetectingColors, setIsDetectingColors] = useState(false)
  const [isDesigning, setIsDesigning] = useState(false)
  const [previewConfig, setPreviewConfig] = useState<TemplateConfig | null>(
    activeTemplate?.templateConfig || null
  )
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(!!activeTemplate)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "error" })
      return
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "error" })
      return
    }

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/uploads", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")

      const data = await res.json()
      const url = data.fileUrl || `/uploads/${data.filename}`
      await updateLogoUrl(url)
      setLogoUrl(url)
      toast({ title: "Logo uploaded", variant: "success" })
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  async function handleDetectColors() {
    if (!logoUrl) {
      toast({ title: "Upload a logo first", variant: "warning" })
      return
    }

    setIsDetectingColors(true)
    try {
      const res = await fetch("/api/settings/brand/detect-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl }),
      })

      if (!res.ok) throw new Error("Color detection failed")

      const colors: BrandColors = await res.json()
      setBrandColors(colors)
      await updateBrandColors(colors)
      toast({ title: "Colors detected", description: "Brand colors extracted from your logo", variant: "success" })
    } catch (err) {
      toast({
        title: "Detection failed",
        description: err instanceof Error ? err.message : "Could not analyze logo",
        variant: "error",
      })
    } finally {
      setIsDetectingColors(false)
    }
  }

  async function handleDesignTemplate() {
    setIsDesigning(true)
    setTemplateSaved(false)
    try {
      const res = await fetch("/api/settings/brand/design-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandColors,
          companyName: user.companyName,
          tagline: user.tagline,
          trades: user.trades,
        }),
      })

      if (!res.ok) throw new Error("Template design failed")

      const config: TemplateConfig = await res.json()
      setPreviewConfig(config)
      toast({ title: "Template designed", description: "Review your template below", variant: "success" })
    } catch (err) {
      toast({
        title: "Design failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsDesigning(false)
    }
  }

  async function handleSaveTemplate() {
    if (!previewConfig) return
    setIsSavingTemplate(true)
    try {
      await saveTemplate(previewConfig)
      setTemplateSaved(true)
      toast({ title: "Template saved", description: "Your branded template is now active", variant: "success" })
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsSavingTemplate(false)
    }
  }

  function handleColorChange(field: keyof BrandColors, value: string) {
    setBrandColors((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Logo & Colors */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold text-foreground">Logo & Brand Colors</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {logoUrl ? (
                <div className="w-24 h-24 rounded-lg border border-card-border overflow-hidden bg-white flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Company logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border border-dashed border-card-border flex items-center justify-center bg-card">
                  <ImageIcon className="h-8 w-8 text-muted" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Company Logo</p>
              <p className="text-xs text-muted mb-3">PNG or JPG, max 2MB. Used on branded PDFs and proposals.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <>
                    <Spinner size="sm" className="mr-1.5" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1.5" />
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Brand Colors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Brand Colors</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDetectColors}
                disabled={isDetectingColors || !logoUrl}
              >
                {isDetectingColors ? (
                  <>
                    <Spinner size="sm" className="mr-1.5" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Palette className="h-4 w-4 mr-1.5" />
                    Detect from Logo
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(["primary", "secondary", "accent"] as const).map((key) => (
                <div key={key}>
                  <label className="text-xs text-muted capitalize block mb-1">{key}</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-md border border-card-border shrink-0"
                      style={{ backgroundColor: brandColors[key] }}
                    />
                    <Input
                      value={brandColors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="font-mono text-xs"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Company Info Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-brand-blue" />
              <h2 className="font-semibold text-foreground">Company Info</h2>
            </div>
            <Link href="/settings" className="text-xs text-brand-orange hover:text-brand-orange-hover flex items-center gap-1">
              Edit in Profile <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted">Company: </span>
              <span className="text-foreground font-medium">{user.companyName || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted">Tagline: </span>
              <span className="text-foreground font-medium">{user.tagline || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted">Phone: </span>
              <span className="text-foreground font-medium">{user.phone || "Not set"}</span>
            </div>
            <div>
              <span className="text-muted">Address: </span>
              <span className="text-foreground font-medium">{user.address || "Not set"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: AI Template Designer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold text-foreground">AI Template Designer</h2>
          </div>
          <p className="text-sm text-muted mt-1">
            Let AI design a professional PDF template that matches your brand.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDesignTemplate}
            disabled={isDesigning}
            className="w-full sm:w-auto"
          >
            {isDesigning ? (
              <>
                <Spinner size="sm" className="mr-2 text-white" />
                Designing your template...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Design My Template
              </>
            )}
          </Button>

          {/* Template Preview */}
          {previewConfig && (
            <div className="border border-card-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-card-border bg-card/50">
                <p className="text-sm font-medium text-foreground">Template Preview</p>
              </div>
              <div className="p-6">
                {/* Header Preview */}
                <div
                  className="p-4 rounded-lg mb-4 flex items-center gap-4"
                  style={{
                    backgroundColor: previewConfig.header.bgColor || previewConfig.colors.primary,
                    borderLeft: previewConfig.header.borderStyle === "accent"
                      ? `4px solid ${previewConfig.colors.accent}`
                      : undefined,
                  }}
                >
                  {logoUrl && previewConfig.header.logoPosition === "left" && (
                    <div className="w-12 h-12 rounded bg-white flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="" className="max-w-[40px] max-h-[40px] object-contain" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white text-lg">
                      {user.companyName || "Your Company"}
                    </p>
                    {previewConfig.header.showTagline && user.tagline && (
                      <p className="text-white/80 text-sm">{user.tagline}</p>
                    )}
                  </div>
                </div>

                {/* Body Preview */}
                <div className="mb-4">
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-2 px-2 py-1 rounded"
                    style={{
                      backgroundColor: previewConfig.body.categoryStyle === "banner"
                        ? `${previewConfig.colors.primary}15`
                        : "transparent",
                      borderBottom: previewConfig.body.categoryStyle === "underline"
                        ? `2px solid ${previewConfig.colors.primary}`
                        : undefined,
                      color: previewConfig.colors.primary,
                    }}
                  >
                    Demo Category
                  </div>
                  {["Item one description", "Item two description", "Item three description"].map(
                    (item, i) => (
                      <div
                        key={i}
                        className="flex justify-between py-1.5 px-2 text-xs"
                        style={{
                          backgroundColor:
                            previewConfig.body.alternateRowBg && i % 2 === 1
                              ? `${previewConfig.colors.secondary}08`
                              : "transparent",
                        }}
                      >
                        <span style={{ color: previewConfig.colors.text }}>{item}</span>
                        <span style={{ color: previewConfig.colors.text }} className="font-medium">
                          $1,234.00
                        </span>
                      </div>
                    )
                  )}
                </div>

                {/* Totals Preview */}
                <div
                  className="ml-auto max-w-[200px] p-3 rounded-lg"
                  style={{
                    backgroundColor:
                      previewConfig.totals.style === "boxed"
                        ? `${previewConfig.colors.primary}08`
                        : "transparent",
                    border:
                      previewConfig.totals.style === "boxed"
                        ? `1px solid ${previewConfig.colors.primary}20`
                        : undefined,
                  }}
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Subtotal</span>
                    <span className="font-medium">$3,702.00</span>
                  </div>
                  <div
                    className="flex justify-between text-sm font-bold pt-1 border-t"
                    style={{
                      borderColor: previewConfig.totals.highlightColor,
                      color: previewConfig.totals.highlightColor,
                    }}
                  >
                    <span>Total</span>
                    <span>$3,702.00</span>
                  </div>
                </div>

                {/* Footer Preview */}
                {previewConfig.footer.showGeneratedBy && (
                  <p className="text-center text-[10px] text-muted mt-4">
                    Generated by EstimAI Pro
                    {previewConfig.footer.customText && ` — ${previewConfig.footer.customText}`}
                  </p>
                )}
              </div>

              <div className="p-4 border-t border-card-border bg-card/50 flex items-center gap-3">
                <Button
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate || templateSaved}
                >
                  {templateSaved ? (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      Template Saved
                    </>
                  ) : isSavingTemplate ? (
                    <>
                      <Spinner size="sm" className="mr-1.5 text-white" />
                      Saving...
                    </>
                  ) : (
                    "Save Template"
                  )}
                </Button>
                <Button variant="outline" onClick={handleDesignTemplate} disabled={isDesigning}>
                  Redesign
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
