"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabPanel } from "@/components/ui/tabs"
import { LineItemTable } from "@/components/estimates/line-item-table"
import { EditBar } from "@/components/estimates/edit-bar"
import { MarkupSlider } from "@/components/estimates/markup-slider"
import { ClientEstimateView } from "@/components/estimates/client-estimate-view"
import { AIWizard } from "@/components/estimates/ai-wizard"
import { AnimatedCurrency } from "@/components/ui/animated-currency"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import {
  FileText,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { QuickTeachButton } from "@/components/training/quick-teach-button"
import { ExportDropdown } from "@/components/estimates/export-dropdown"
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
  createdAt: Date
  updatedAt: Date
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
}

export function EstimateView({ estimate, isNew = false, userTier = "FREE" }: EstimateViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("costs")

  // Local markup state — initialized from estimate, updated live by slider
  const [markupPercent, setMarkupPercent] = useState(estimate.markupPercent)
  const [markupAmount, setMarkupAmount] = useState(estimate.markupAmount)
  const [totalAmount, setTotalAmount] = useState(estimate.totalAmount)

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

  // Calculate animation delay for totals (after all line items finish animating)
  const totalAnimationItems = estimate.lineItems.length + Object.keys(
    estimate.lineItems.reduce((acc, item) => {
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
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/estimates"
            className="inline-flex items-center text-sm text-muted hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Estimates
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{estimate.title}</h1>
          <div className="flex items-center gap-3 mt-2">
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
        <div className="flex gap-2">
          <QuickTeachButton estimateId={estimate.id} />
          <ExportDropdown estimateId={estimate.id} userTier={userTier} />
        </div>
      </div>

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

        {/* Project Description */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-orange" />
              <h2 className="font-semibold text-foreground">Project Description</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">
              {estimate.description}
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
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Line Items</h2>
              <span className="text-sm text-muted">
                {estimate.lineItems.length} items
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <LineItemTable lineItems={estimate.lineItems} showLabor={true} isNew={isNew} />
          </CardContent>
        </Card>

        {/* Totals — uses local markup state */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2 max-w-sm ml-auto">
              {/* Labor & Material Summary */}
              {(() => {
                const totalLabor = estimate.lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0)
                const totalMaterial = estimate.lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0)
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
        {estimate.editHistory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted" />
                <h2 className="font-semibold text-foreground">Edit History</h2>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {estimate.editHistory.map((edit) => (
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
          description={estimate.description}
          projectType={estimate.projectType}
          createdAt={estimate.createdAt}
          clientName={estimate.client?.name ?? null}
          lineItems={estimate.lineItems}
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

      {/* Edit Bar — always visible below tabs */}
      <div className="pb-24" />
      <EditBar
        estimateId={estimate.id}
        onEditStateChange={setIsEditing}
      />
    </div>
  )
}
