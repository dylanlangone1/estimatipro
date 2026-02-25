"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  Save,
  Download,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  FileText,
  Bookmark,
  CheckCircle2,
} from "lucide-react"
import type { ProposalData } from "@/types/proposal"

type ProposalSection =
  | "aboutUs"
  | "projectOverview"
  | "scopeOfWork"
  | "timeline"
  | "investmentSummary"
  | "terms"
  | "exclusions"
  | "warranty"

const SECTIONS: { key: ProposalSection; label: string; icon: string; canSaveAsDefault?: boolean }[] = [
  { key: "aboutUs", label: "About Us", icon: "🏢", canSaveAsDefault: true },
  { key: "projectOverview", label: "Project Overview", icon: "📝" },
  { key: "scopeOfWork", label: "Scope of Work", icon: "📋" },
  { key: "timeline", label: "Timeline", icon: "📅", canSaveAsDefault: true },
  { key: "investmentSummary", label: "Investment Summary", icon: "💰" },
  { key: "terms", label: "Terms & Conditions", icon: "📄" },
  { key: "exclusions", label: "Exclusions", icon: "🚫", canSaveAsDefault: true },
  { key: "warranty", label: "Warranty", icon: "🛡️", canSaveAsDefault: true },
]

// Map section key to ProposalDefaults field name
const DEFAULTS_FIELD_MAP: Partial<Record<ProposalSection, string>> = {
  aboutUs: "aboutUs",
  timeline: "timelineTemplate",
  warranty: "warranty",
  exclusions: "exclusions",
}

export default function ProposalEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const estimateId = params.id as string

  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [estimateTitle, setEstimateTitle] = useState("")
  const [hasClient, setHasClient] = useState(false)
  const [saveAsClientDefault, setSaveAsClientDefault] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDefault, setSavingDefault] = useState<ProposalSection | null>(null)
  const [savedDefaults, setSavedDefaults] = useState<Set<ProposalSection>>(new Set())
  const [regenerating, setRegenerating] = useState<ProposalSection | null>(null)
  const [activeSection, setActiveSection] = useState<ProposalSection>("aboutUs")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load proposal data
  const loadProposal = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/ai/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to load proposal")
      }

      const data = await res.json()
      setProposal({
        aboutUs: data.aboutUs || "",
        scopeOfWork: data.scopeOfWork || [],
        timeline: data.timeline || [],
        terms: data.terms || "",
        exclusions: data.exclusions || "",
        warranty: data.warranty || "",
        generatedAt: data.generatedAt || new Date().toISOString(),
        projectOverview: data.projectOverview || "",
        investmentSummary: data.investmentSummary || "",
      })
      setEstimateTitle(data._estimateTitle || "")
      setHasClient(!!data._hasClient)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load proposal",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [estimateId, toast])

  useEffect(() => {
    loadProposal()
  }, [loadProposal])

  // Save proposal
  async function handleSave() {
    if (!proposal) return
    try {
      setSaving(true)
      const res = await fetch("/api/ai/proposal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId,
          proposalData: proposal,
          saveAsClientDefault,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      setHasUnsavedChanges(false)
      toast({
        title: "Saved",
        description: "Proposal changes saved successfully.",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  // Save a section as user default (reusable across all proposals)
  async function handleSaveAsDefault(section: ProposalSection) {
    if (!proposal) return
    const fieldName = DEFAULTS_FIELD_MAP[section]
    if (!fieldName) return

    let value: unknown
    if (section === "timeline") {
      value = proposal.timeline
    } else {
      value = proposal[section as keyof ProposalData]
    }

    setSavingDefault(section)
    try {
      const res = await fetch("/api/settings/proposal-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldName]: value }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save default")
      }

      setSavedDefaults((prev) => new Set([...prev, section]))
      toast({
        title: "Saved as your default",
        description: `This ${SECTIONS.find((s) => s.key === section)?.label} will be pre-filled for future proposals.`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Failed to save default",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setSavingDefault(null)
    }
  }

  // Regenerate a single section
  async function handleRegenerate(section: ProposalSection) {
    try {
      setRegenerating(section)
      const res = await fetch("/api/ai/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId, regenerateSection: section }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to regenerate")
      }

      const data = await res.json()
      setProposal((prev) => {
        if (!prev) return prev
        return { ...prev, [section]: data[section] }
      })
      setHasUnsavedChanges(true)
      toast({
        title: "Regenerated",
        description: `${SECTIONS.find((s) => s.key === section)?.label} has been regenerated.`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Regeneration failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setRegenerating(null)
    }
  }

  // Update proposal field
  function updateField<K extends keyof ProposalData>(key: K, value: ProposalData[K]) {
    setProposal((prev) => {
      if (!prev) return prev
      return { ...prev, [key]: value }
    })
    setHasUnsavedChanges(true)
  }

  // Preview PDF
  function handlePreview() {
    window.open(`/api/pdf/${estimateId}?type=proposal`, "_blank")
  }

  // Download PDF
  function handleDownload() {
    const link = document.createElement("a")
    link.href = `/api/pdf/${estimateId}?type=proposal`
    link.download = `${estimateTitle || "Proposal"}.pdf`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted">Generating proposal...</p>
          <p className="text-xs text-muted mt-1">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 text-muted mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Proposal Not Available</h2>
        <p className="text-muted mb-4">Could not load or generate proposal data.</p>
        <Button variant="outline" onClick={() => router.push(`/estimate/${estimateId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Estimate
        </Button>
      </div>
    )
  }

  const currentSectionMeta = SECTIONS.find((s) => s.key === activeSection)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/estimate/${estimateId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Edit Proposal</h1>
            {estimateTitle && (
              <p className="text-sm text-muted">{estimateTitle}</p>
            )}
          </div>
          {hasUnsavedChanges && (
            <span className="text-xs text-brand-orange font-medium px-2 py-0.5 bg-brand-orange/10 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-1.5" />
            Preview PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>
          {hasClient && (
            <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsClientDefault}
                onChange={(e) => setSaveAsClientDefault(e.target.checked)}
                className="rounded border-card-border"
              />
              Save as client default
            </label>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-1.5" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar — Section Nav */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1 sticky top-4">
            {SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${
                  activeSection === section.key
                    ? "bg-brand-orange/10 text-brand-orange font-medium"
                    : "text-muted hover:text-foreground hover:bg-card-border/20"
                }`}
              >
                <span>{section.icon}</span>
                <span className="flex-1">{section.label}</span>
                {section.canSaveAsDefault && savedDefaults.has(section.key) && (
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-card-border rounded-xl p-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {currentSectionMeta?.icon}{" "}
                {currentSectionMeta?.label}
              </h2>
              <div className="flex items-center gap-2">
                {/* Save as Default — only for applicable sections */}
                {currentSectionMeta?.canSaveAsDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveAsDefault(activeSection)}
                    disabled={savingDefault !== null}
                    className="text-xs"
                    title="Save this content as your default for future proposals"
                  >
                    {savingDefault === activeSection ? (
                      <>
                        <Spinner size="sm" className="mr-1.5" />
                        Saving default...
                      </>
                    ) : savedDefaults.has(activeSection) ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                        Saved as default
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                        Save as My Default
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRegenerate(activeSection)}
                  disabled={regenerating !== null}
                >
                  {regenerating === activeSection ? (
                    <>
                      <Spinner size="sm" className="mr-1.5" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Regenerate with AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* About Us */}
            {activeSection === "aboutUs" && (
              <div>
                <p className="text-sm text-muted mb-3">
                  Your company introduction. This appears on page 2 of the proposal.
                </p>
                <textarea
                  value={proposal.aboutUs}
                  onChange={(e) => updateField("aboutUs", e.target.value)}
                  rows={10}
                  className="w-full bg-background border border-card-border rounded-lg p-4 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  placeholder="Tell clients about your company, expertise, and what sets you apart..."
                />
              </div>
            )}

            {/* Project Overview */}
            {activeSection === "projectOverview" && (
              <div>
                <p className="text-sm text-muted mb-3">
                  Executive summary of the project. Appears on page 3 of the proposal (only if filled in).
                </p>
                <textarea
                  value={proposal.projectOverview || ""}
                  onChange={(e) => updateField("projectOverview", e.target.value)}
                  rows={10}
                  className="w-full bg-background border border-card-border rounded-lg p-4 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  placeholder="Provide an executive summary of this project — scope, approach, and key value highlights..."
                />
              </div>
            )}

            {/* Scope of Work */}
            {activeSection === "scopeOfWork" && (
              <div className="space-y-4">
                <p className="text-sm text-muted mb-3">
                  Narrative descriptions for each category of work. One section per trade category.
                </p>
                {proposal.scopeOfWork.map((scope, i) => (
                  <div key={i} className="border border-card-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        value={scope.category}
                        onChange={(e) => {
                          const updated = [...proposal.scopeOfWork]
                          updated[i] = { ...updated[i], category: e.target.value }
                          updateField("scopeOfWork", updated)
                        }}
                        className="font-medium text-foreground bg-transparent border-none focus:outline-none text-sm"
                        placeholder="Category name"
                      />
                      <button
                        onClick={() => {
                          const updated = proposal.scopeOfWork.filter((_, idx) => idx !== i)
                          updateField("scopeOfWork", updated)
                        }}
                        className="text-muted hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={scope.narrative}
                      onChange={(e) => {
                        const updated = [...proposal.scopeOfWork]
                        updated[i] = { ...updated[i], narrative: e.target.value }
                        updateField("scopeOfWork", updated)
                      }}
                      rows={4}
                      className="w-full bg-background border border-card-border rounded-lg p-3 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                      placeholder="Describe the work for this category..."
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateField("scopeOfWork", [
                      ...proposal.scopeOfWork,
                      { category: "New Category", narrative: "" },
                    ])
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Category
                </Button>
              </div>
            )}

            {/* Timeline */}
            {activeSection === "timeline" && (
              <div className="space-y-4">
                <p className="text-sm text-muted mb-3">
                  Project phases with estimated durations. Shown as a visual timeline in the proposal.
                </p>
                {proposal.timeline.map((phase, i) => (
                  <div key={i} className="border border-card-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <input
                          value={phase.phase}
                          onChange={(e) => {
                            const updated = [...proposal.timeline]
                            updated[i] = { ...updated[i], phase: e.target.value }
                            updateField("timeline", updated)
                          }}
                          className="font-medium text-foreground bg-transparent border-none focus:outline-none text-sm flex-1"
                          placeholder="Phase name"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={phase.duration}
                          onChange={(e) => {
                            const updated = [...proposal.timeline]
                            updated[i] = { ...updated[i], duration: e.target.value }
                            updateField("timeline", updated)
                          }}
                          className="w-24 text-sm text-brand-orange bg-brand-orange/5 border border-brand-orange/20 rounded-md px-2 py-1 focus:outline-none text-center"
                          placeholder="e.g. 2 weeks"
                        />
                        <button
                          onClick={() => {
                            const updated = proposal.timeline.filter((_, idx) => idx !== i)
                            updateField("timeline", updated)
                          }}
                          className="text-muted hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={phase.description}
                      onChange={(e) => {
                        const updated = [...proposal.timeline]
                        updated[i] = { ...updated[i], description: e.target.value }
                        updateField("timeline", updated)
                      }}
                      rows={2}
                      className="w-full bg-background border border-card-border rounded-lg p-3 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                      placeholder="What happens during this phase..."
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateField("timeline", [
                      ...proposal.timeline,
                      { phase: "New Phase", duration: "1 week", description: "" },
                    ])
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Phase
                </Button>
              </div>
            )}

            {/* Investment Summary */}
            {activeSection === "investmentSummary" && (
              <div>
                <p className="text-sm text-muted mb-3">
                  Investment narrative and payment schedule description. Appears on the Investment &amp; Payment page of the proposal.
                </p>
                <textarea
                  value={proposal.investmentSummary || ""}
                  onChange={(e) => updateField("investmentSummary", e.target.value)}
                  rows={8}
                  className="w-full bg-background border border-card-border rounded-lg p-4 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  placeholder="Describe the investment value, payment schedule, and financing options..."
                />
              </div>
            )}

            {/* Terms & Conditions */}
            {activeSection === "terms" && (
              <div>
                <p className="text-sm text-muted mb-3">
                  Payment terms, change order policy, and contract conditions.
                </p>
                <textarea
                  value={proposal.terms}
                  onChange={(e) => updateField("terms", e.target.value)}
                  rows={12}
                  className="w-full bg-background border border-card-border rounded-lg p-4 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  placeholder="Standard payment terms, change order policies, warranty information..."
                />
              </div>
            )}

            {/* Exclusions */}
            {activeSection === "exclusions" && (
              <div>
                <p className="text-sm text-muted mb-3">
                  Items not included in the estimate. Helps set clear expectations with clients.
                </p>
                <textarea
                  value={proposal.exclusions || ""}
                  onChange={(e) => updateField("exclusions", e.target.value)}
                  rows={8}
                  className="w-full bg-background border border-card-border rounded-lg p-4 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  placeholder="List items not included in this estimate (e.g., landscaping, furniture, permits not specified, hazardous material abatement...)"
                />
              </div>
            )}

            {/* Warranty */}
            {activeSection === "warranty" && (
              <div>
                <p className="text-sm text-muted mb-3">
                  Warranty information for workmanship and materials.
                </p>
                <textarea
                  value={proposal.warranty || ""}
                  onChange={(e) => updateField("warranty", e.target.value)}
                  rows={8}
                  className="w-full bg-background border border-card-border rounded-lg p-4 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  placeholder="Describe your workmanship warranty, material warranties, and any guarantee terms..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
