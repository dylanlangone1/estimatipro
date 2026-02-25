"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { FileText, Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react"

interface TimelinePhase {
  phase: string
  duration: string
  description: string
}

interface ProposalDefaultsData {
  aboutUs: string
  timelineTemplate: TimelinePhase[]
  warranty: string
  exclusions: string
}

interface ProposalDefaultsSettingsProps {
  isMax: boolean
}

export function ProposalDefaultsSettings({ isMax }: ProposalDefaultsSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    aboutUs: true,
    timeline: false,
    warranty: false,
    exclusions: false,
  })
  const [data, setData] = useState<ProposalDefaultsData>({
    aboutUs: "",
    timelineTemplate: [],
    warranty: "",
    exclusions: "",
  })

  useEffect(() => {
    if (!isMax) return
    fetch("/api/settings/proposal-defaults")
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setData(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isMax])

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function saveSection(section: keyof ProposalDefaultsData) {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/proposal-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: data[section] }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: "Default saved", description: "This section will pre-fill future proposals.", variant: "success" })
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  function addPhase() {
    setData((prev) => ({
      ...prev,
      timelineTemplate: [
        ...prev.timelineTemplate,
        { phase: "", duration: "", description: "" },
      ],
    }))
  }

  function updatePhase(index: number, field: keyof TimelinePhase, value: string) {
    setData((prev) => ({
      ...prev,
      timelineTemplate: prev.timelineTemplate.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }))
  }

  function removePhase(index: number) {
    setData((prev) => ({
      ...prev,
      timelineTemplate: prev.timelineTemplate.filter((_, i) => i !== index),
    }))
  }

  if (!isMax) {
    return (
      <Card className="border-card-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Proposal Defaults</h2>
              <p className="text-sm text-muted-foreground">Save reusable content for future proposals</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium text-primary">MAX Plan Required</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade to MAX to save About Us, timeline templates, warranty language, and exclusions as reusable defaults.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-card-border bg-card">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-card-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Proposal Defaults</h2>
              <p className="text-sm text-muted-foreground">
                Saved content auto-populates on every new Final Proposal. AI only generates project-specific sections.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">MAX</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* About Us */}
        <CollapsibleSection
          title="About Us"
          description="Your company narrative — used verbatim in every proposal"
          expanded={expanded.aboutUs}
          onToggle={() => toggleSection("aboutUs")}
          filled={Boolean(data.aboutUs)}
        >
          <textarea
            value={data.aboutUs}
            onChange={(e) => setData((p) => ({ ...p, aboutUs: e.target.value }))}
            placeholder="Describe your company, specialties, values, and what sets you apart. This text will appear on the About Us page of every Final Proposal."
            className="min-h-[120px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={5}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveSection("aboutUs")}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
              Save as Default
            </Button>
          </div>
        </CollapsibleSection>

        {/* Timeline Template */}
        <CollapsibleSection
          title="Timeline Template"
          description="Default phases — AI adapts durations & descriptions per project"
          expanded={expanded.timeline}
          onToggle={() => toggleSection("timeline")}
          filled={data.timelineTemplate.length > 0}
        >
          <div className="space-y-3">
            {data.timelineTemplate.map((phase, i) => (
              <div key={i} className="relative rounded-lg border border-input bg-card-muted p-3">
                <button
                  type="button"
                  onClick={() => removePhase(i)}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="grid gap-2 sm:grid-cols-2 mb-2">
                  <div>
                    <label className="mb-0.5 block text-xs text-muted-foreground">Phase Name</label>
                    <input
                      value={phase.phase}
                      onChange={(e) => updatePhase(i, "phase", e.target.value)}
                      placeholder="e.g. Site Preparation"
                      className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs text-muted-foreground">Duration</label>
                    <input
                      value={phase.duration}
                      onChange={(e) => updatePhase(i, "duration", e.target.value)}
                      placeholder="e.g. 1 week"
                      className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-muted-foreground">Description</label>
                  <input
                    value={phase.description}
                    onChange={(e) => updatePhase(i, "description", e.target.value)}
                    placeholder="What happens during this phase"
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addPhase}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-input py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Phase
            </button>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveSection("timelineTemplate")}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
              Save as Default
            </Button>
          </div>
        </CollapsibleSection>

        {/* Warranty */}
        <CollapsibleSection
          title="Warranty"
          description="Your standard warranty language — used verbatim unless AI adapts it"
          expanded={expanded.warranty}
          onToggle={() => toggleSection("warranty")}
          filled={Boolean(data.warranty)}
        >
          <textarea
            value={data.warranty}
            onChange={(e) => setData((p) => ({ ...p, warranty: e.target.value }))}
            placeholder="Describe your warranty coverage, duration, what is and isn't covered, and the claims process."
            className="min-h-[100px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveSection("warranty")}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
              Save as Default
            </Button>
          </div>
        </CollapsibleSection>

        {/* Exclusions */}
        <CollapsibleSection
          title="Standard Exclusions"
          description="What is NOT included in your estimates by default"
          expanded={expanded.exclusions}
          onToggle={() => toggleSection("exclusions")}
          filled={Boolean(data.exclusions)}
        >
          <textarea
            value={data.exclusions}
            onChange={(e) => setData((p) => ({ ...p, exclusions: e.target.value }))}
            placeholder="List items that are not included in your standard estimates — furniture, landscaping beyond scope, hazardous material removal, architectural fees, utility company fees, etc."
            className="min-h-[100px] w-full resize-none rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveSection("exclusions")}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
              Save as Default
            </Button>
          </div>
        </CollapsibleSection>
      </CardContent>
    </Card>
  )
}

// ─── Collapsible Section Helper ───

function CollapsibleSection({
  title,
  description,
  expanded,
  onToggle,
  filled,
  children,
}: {
  title: string
  description: string
  expanded: boolean
  onToggle: () => void
  filled: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-card-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-card-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              filled ? "bg-green-500" : "bg-muted-foreground/30"
            }`}
          />
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && <div className="space-y-3 border-t border-card-border p-4">{children}</div>}
    </div>
  )
}
