"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabPanel } from "@/components/ui/tabs"
import { LineItemTable } from "@/components/estimates/line-item-table"
import { EditBar } from "@/components/estimates/edit-bar"
import { MarkupSlider } from "@/components/estimates/markup-slider"
import { ClientEstimateView } from "@/components/estimates/client-estimate-view"
import { AIWizard } from "@/components/estimates/ai-wizard"
import { AnimatedCurrency } from "@/components/ui/animated-currency"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/toast"
import {
  FileText,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  FileSignature,
  Pencil,
  Check,
  X,
} from "lucide-react"
import Link from "next/link"
import { QuickTeachButton } from "@/components/training/quick-teach-button"
import { ExportDropdown } from "@/components/estimates/export-dropdown"
import { EstimateMaxActions } from "@/components/estimates/estimate-max-actions"
import type { DeviationAlert } from "@/types/estimate"
import type { JsonValue } from "@prisma/client/runtime/client"
import type { SubscriptionTier } from "@/generated/prisma/client"

interface EstimateWithRelations {
  id: string
  title: string
  description: string
  projectType: string | null
  status: string
  subtotal: number
  markupPercent: number
  markupAmount: number
  taxAmount: number
  totalAmount: number
  assumptions: JsonValue | null
  deviationAlerts: JsonValue | null
  confidenceScore: number | null
  proposalData: JsonValue | null
  isContract: boolean
  createdAt: Date
  updatedAt: Date
  // MAX tier fields
  projectPhotoUrl?: string | null
  stripePaymentLink?: string | null
  lineItems: Array<{
    id: string
    category: string
    description: string
    quantity: number
    unit: string
    unitCost: number
    totalCost: number
    laborCost: number | null
    materialCost: number | null
    markupPercent: number | null
    sortOrder: number
  }>
  editHistory: Array<{
    id: string
    editPrompt: string
    createdAt: Date
  }>
  client: { name: string } | null
}

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  WON: "success",
  LOST: "error",
  EXPIRED: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
}

interface EstimateViewProps {
  estimate: EstimateWithRelations
  isNew?: boolean
  userTier?: SubscriptionTier
  stripeConnected?: boolean
}

export function EstimateView({ estimate, isNew = false, userTier = "FREE", stripeConnected = false }: EstimateViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("costs")
  const [isContract, setIsContract] = useState(estimate.isContract)

  // Strip AI prompt-engineering text that may be baked into older DB records
  // (PROJECT LOCATION / PERMIT NOTE blocks injected during generation).
  const cleanedDescription = estimate.description
    .split("\n\nPROJECT LOCATION:")[0]
    .split("\n\nPERMIT NOTE:")[0]
    .trim()

  // ─── Inline editing state ───
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState(estimate.title)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editDescValue, setEditDescValue] = useState(cleanedDescription)
  const [isSavingField, setIsSavingField] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descTextareaRef = useRef<HTMLTextAreaElement>(null)

  const canContract = userTier === "PRO" || userTier === "MAX"
  const isMax = userTier === "MAX"

  const toggleContract = useCallback(async () => {
    const newValue = !isContract
    setIsContract(newValue)
    try {
      await fetch(`/api/estimates/${estimate.id}/contract`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isContract: newValue }),
      })
    } catch {
      setIsContract(!newValue)
    }
  }, [isContract, estimate.id])

  // Local markup state
  const [markupPercent, setMarkupPercent] = useState(estimate.markupPercent)
  const [markupAmount, setMarkupAmount] = useState(estimate.markupAmount)
  const [totalAmount, setTotalAmount] = useState(estimate.totalAmount)

  const lineItems = estimate.lineItems || []
  const editHistory = estimate.editHistory || []
  const alerts = (estimate.deviationAlerts as DeviationAlert[] | null) ?? []
  const assumptions = (estimate.assumptions as string[] | null) ?? []

  const handleMarkupChange = useCallback(
    (newPercent: number, newMarkupAmount: number, newTotal: number) => {
      setMarkupPercent(newPercent)
      setMarkupAmount(newMarkupAmount)
      setTotalAmount(newTotal)
    },
    []
  )

  // ─── Inline save helpers ───
  async function saveField(field: "title" | "description", value: string) {
    setIsSavingField(true)
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Saved", variant: "success" })
      router.refresh()
    } catch {
      toast({ title: "Failed to save", variant: "error" })
    } finally {
      setIsSavingField(false)
      if (field === "title") setEditingTitle(false)
      if (field === "description") setEditingDescription(false)
    }
  }

  // Animation delay for totals
  const totalAnimationItems = lineItems.length + Object.keys(
    lineItems.reduce((acc, item) => {
      acc[item.category] = true
      return acc
    }, {} as Record<string, boolean>)
  ).length * 2
  const totalsDelay = totalAnimationItems * 60 + 200

  const tabItems = [
    {
      value: "costs",
      label: "Costs",
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      value: "client",
      label: "Client Estimate",
      icon: <FileText className="h-4 w-4" />,
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      {/* Edit overlay */}
      {isEditing && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-5 rounded-xl animate-fade-in flex items-center justify-center">
          <div className="flex items-center gap-3 px-6 py-3 bg-card rounded-full shadow-lg border border-card-border">
            <Spinner size="sm" />
            <span className="text-sm font-medium text-foreground">
              Applying changes...
            </span>
          </div>
        </div>
      )}

      {/* Header — always visible above tabs */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/estimates"
            className="inline-flex items-center text-sm text-muted hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Estimates
          </Link>

          {/* Editable Title */}
          {editingTitle ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveField("title", editTitleValue)
                  if (e.key === "Escape") {
                    setEditTitleValue(estimate.title)
                    setEditingTitle(false)
                  }
                }}
                className="text-2xl font-bold text-foreground bg-transparent border-b-2 border-brand-orange focus:outline-none w-full"
                autoFocus
                disabled={isSavingField}
              />
              <button
                onClick={() => saveField("title", editTitleValue)}
                disabled={isSavingField}
                className="p-1 text-success hover:text-success/80"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setEditTitleValue(estimate.title)
                  setEditingTitle(false)
                }}
                className="p-1 text-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{estimate.title}</h1>
              <button
                onClick={() => {
                  setEditTitleValue(estimate.title)
                  setEditingTitle(true)
                }}
                className="p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-brand-orange transition-all"
                title="Edit title"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <Badge variant={statusVariant[estimate.status] || "default"}>
              {estimate.status}
            </Badge>
            {estimate.projectType && (
              <span className="text-sm text-muted capitalize">
                {estimate.projectType.replace(/_/g, " ")}
              </span>
            )}
            <span className="text-sm text-muted">
              {formatDate(estimate.createdAt)}
            </span>
            {estimate.client && (
              <span className="text-sm text-muted">
                Client: {estimate.client.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canContract && (
            <button
              onClick={toggleContract}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                isContract
                  ? "bg-brand-orange/10 border-brand-orange/30 text-brand-orange"
                  : "bg-card border-card-border text-muted hover:text-foreground"
              }`}
              title={isContract ? "Switch to estimate mode" : "Switch to contract mode"}
            >
              <FileSignature className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isContract ? "Contract" : "Estimate"}
              </span>
            </button>
          )}
          {isMax && (
            <EstimateMaxActions
              estimateId={estimate.id}
              projectPhotoUrl={estimate.projectPhotoUrl ?? null}
              stripePaymentLink={estimate.stripePaymentLink ?? null}
              stripeConnected={stripeConnected}
            />
          )}
          <QuickTeachButton estimateId={estimate.id} />
          <ExportDropdown estimateId={estimate.id} userTier={userTier} />
        </div>
      </div>

      {/* ─── AI Edit Bar — PROMINENT, right below header ─── */}
      <EditBar
        estimateId={estimate.id}
        onEditStateChange={setIsEditing}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} tabs={tabItems} />

      {/* ─── Costs Tab ─── */}
      <TabPanel value="costs" activeValue={activeTab} className="space-y-6">
        {/* Markup Slider */}
        <MarkupSlider
          subtotal={estimate.subtotal}
          taxAmount={estimate.taxAmount}
          markupPercent={markupPercent}
          estimateId={estimate.id}
          onMarkupChange={handleMarkupChange}
        />

        {/* Deviation Alerts */}
        {alerts.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground mb-2">
                    Pricing Deviation Alerts
                  </p>
                  <ul className="space-y-1">
                    {alerts.map((alert, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        {alert.severity === "critical" ? (
                          <AlertTriangle className="h-4 w-4 text-error shrink-0 mt-0.5" />
                        ) : alert.severity === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        ) : (
                          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                        )}
                        <span className="text-muted">{alert.alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Description — Editable */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-orange" />
                <h2 className="font-semibold text-foreground">Project Description</h2>
              </div>
              {!editingDescription && (
                <button
                  onClick={() => {
                    setEditDescValue(cleanedDescription)
                    setEditingDescription(true)
                  }}
                  className="p-1.5 text-muted hover:text-brand-orange transition-colors rounded-lg hover:bg-card-border/20"
                  title="Edit description"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingDescription ? (
              <div className="space-y-3">
                <textarea
                  ref={descTextareaRef}
                  value={editDescValue}
                  onChange={(e) => setEditDescValue(e.target.value)}
                  className="w-full text-foreground bg-background border border-card-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 resize-y min-h-[120px]"
                  rows={6}
                  autoFocus
                  disabled={isSavingField}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveField("description", editDescValue)}
                    disabled={isSavingField}
                  >
                    {isSavingField ? <Spinner size="sm" className="mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditDescValue(cleanedDescription)
                      setEditingDescription(false)
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-foreground whitespace-pre-wrap">
                  {cleanedDescription}
                </p>
                {assumptions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-card-border">
                    <p className="text-sm font-medium text-muted mb-2">Assumptions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {assumptions.map((a, i) => (
                        <li key={i} className="text-sm text-muted">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Line Items</h2>
              <span className="text-sm text-muted">
                {lineItems.length} items
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <LineItemTable
              lineItems={lineItems}
              showLabor={true}
              isNew={isNew}
              editable={true}
              estimateId={estimate.id}
            />
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2 max-w-sm ml-auto">
              {(() => {
                const totalLabor = lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0)
                const totalMaterial = lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0)
                if (totalLabor > 0 || totalMaterial > 0) {
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Total Labor</span>
                        <span className="text-foreground tabular-nums">
                          {formatCurrency(totalLabor)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Total Materials</span>
                        <span className="text-foreground tabular-nums">
                          {formatCurrency(totalMaterial)}
                        </span>
                      </div>
                      <div className="border-t border-card-border/50 my-1" />
                    </>
                  )
                }
                return null
              })()}
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                {isNew ? (
                  <AnimatedCurrency
                    value={estimate.subtotal}
                    delay={totalsDelay}
                    className="text-foreground font-medium tabular-nums"
                  />
                ) : (
                  <span className="text-foreground font-medium tabular-nums">
                    {formatCurrency(estimate.subtotal)}
                  </span>
                )}
              </div>
              {markupPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">
                    Markup ({markupPercent}%)
                  </span>
                  {isNew ? (
                    <AnimatedCurrency
                      value={markupAmount}
                      delay={totalsDelay + 200}
                      className="text-foreground tabular-nums"
                    />
                  ) : (
                    <span className="text-foreground tabular-nums">
                      {formatCurrency(markupAmount)}
                    </span>
                  )}
                </div>
              )}
              {estimate.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Tax</span>
                  {isNew ? (
                    <AnimatedCurrency
                      value={estimate.taxAmount}
                      delay={totalsDelay + 400}
                      className="text-foreground tabular-nums"
                    />
                  ) : (
                    <span className="text-foreground tabular-nums">
                      {formatCurrency(estimate.taxAmount)}
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-card-border">
                <span className="font-semibold text-foreground">Total</span>
                {isNew ? (
                  <AnimatedCurrency
                    value={totalAmount}
                    delay={totalsDelay + 600}
                    duration={1500}
                    className="text-xl font-bold text-brand-orange tabular-nums"
                  />
                ) : (
                  <span className="text-xl font-bold text-brand-orange tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit History */}
        {editHistory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted" />
                <h2 className="font-semibold text-foreground">Edit History</h2>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {editHistory.map((edit) => (
                  <li
                    key={edit.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-foreground">&quot;{edit.editPrompt}&quot;</p>
                      <p className="text-muted text-xs mt-0.5">
                        {formatDate(edit.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* ─── Client Estimate Tab ─── */}
      <TabPanel value="client" activeValue={activeTab} className="space-y-6">
        <ClientEstimateView
          estimateId={estimate.id}
          title={estimate.title}
          description={cleanedDescription}
          projectType={estimate.projectType}
          createdAt={estimate.createdAt}
          clientName={estimate.client?.name ?? null}
          lineItems={lineItems}
          subtotal={estimate.subtotal}
          taxAmount={estimate.taxAmount}
          markupPercent={markupPercent}
          markupAmount={markupAmount}
          totalAmount={totalAmount}
          proposalData={estimate.proposalData}
        />
      </TabPanel>

      {/* AI Wizard — floating advisor */}
      <AIWizard estimateId={estimate.id} />
    </div>
  )
}
