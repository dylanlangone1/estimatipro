"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { CreditCard, Building2, ExternalLink, CheckCircle, Loader2, Save, ToggleLeft, ToggleRight } from "lucide-react"

interface PaymentSettingsProps {
  isMax: boolean
}

interface PaymentData {
  bankName: string
  bankRoutingNumber: string
  bankAccountNumber: string
  bankAccountType: string
  stripeConnectAccountId: string | null
  stripeConnectOnboarded: boolean
  proposalLogoWatermark: boolean
  invoicePaymentDays: number
}

export function PaymentSettings({ isMax }: PaymentSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [data, setData] = useState<PaymentData>({
    bankName: "",
    bankRoutingNumber: "",
    bankAccountNumber: "",
    bankAccountType: "checking",
    stripeConnectAccountId: null,
    stripeConnectOnboarded: false,
    proposalLogoWatermark: false,
    invoicePaymentDays: 30,
  })

  useEffect(() => {
    if (!isMax) return
    fetch("/api/settings/payment")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setData(d)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isMax])

  // Check Stripe status on return from onboarding
  useEffect(() => {
    if (!isMax) return
    const url = new URL(window.location.href)
    if (url.searchParams.get("stripe") === "success") {
      fetch("/api/stripe/connect/status")
        .then((r) => r.json())
        .then((d) => {
          if (d.onboarded) {
            setData((prev) => ({ ...prev, stripeConnectOnboarded: true }))
            toast({ title: "Stripe Connected!", description: "You can now generate payment links for clients.", variant: "success" })
          }
        })
        .catch(console.error)
      // Clean up URL param
      url.searchParams.delete("stripe")
      window.history.replaceState({}, "", url.toString())
    }
  }, [isMax, toast])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/settings/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: data.bankName,
          bankRoutingNumber: data.bankRoutingNumber,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountType: data.bankAccountType,
          proposalLogoWatermark: data.proposalLogoWatermark,
          invoicePaymentDays: data.invoicePaymentDays,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: "Payment settings saved", variant: "success" })
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

  async function handleConnectStripe() {
    setConnectingStripe(true)
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" })
      const result = await res.json()
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error(result.error || "Failed to start onboarding")
      }
    } catch (err) {
      toast({
        title: "Failed to connect Stripe",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      })
      setConnectingStripe(false)
    }
  }

  if (!isMax) {
    return (
      <Card className="border-card-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Payments &amp; Invoicing</h2>
              <p className="text-sm text-muted-foreground">Accept card payments and wire transfers from clients</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium text-primary">MAX Plan Required</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade to MAX to accept Stripe payments and include wire transfer details on invoices.
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
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Payments &amp; Invoicing</h2>
              <p className="text-sm text-muted-foreground">Card payments and wire transfer details for client invoices</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">MAX</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stripe Connect */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-primary" />
            Online Card Payments (Stripe)
          </h3>
          {data.stripeConnectOnboarded ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800/40 dark:bg-green-900/20">
              <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Stripe Connected</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Clients can pay invoices online. Payment links appear on your Final Proposal PDFs.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => window.open("https://dashboard.stripe.com/", "_blank")}
              >
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Dashboard
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-card-border bg-card-muted p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Connect Stripe to accept credit card payments from clients. A &quot;Pay Online&quot; button will appear on your Final Proposal PDFs.
              </p>
              <Button
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                className="bg-[#635BFF] text-white hover:bg-[#4F46E5]"
                size="sm"
              >
                {connectingStripe ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                {connectingStripe ? "Redirecting to Stripe…" : "Connect Stripe Account"}
              </Button>
            </div>
          )}
        </div>

        {/* Wire Transfer */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Wire Transfer Details
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            These details appear in the &quot;Wire Transfer&quot; section of your invoice page. They are display-only — no payments are processed by EstimAI Pro.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Bank Name</label>
              <Input
                value={data.bankName}
                onChange={(e) => setData((p) => ({ ...p, bankName: e.target.value }))}
                placeholder="e.g. Chase Bank"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Routing Number</label>
              <Input
                value={data.bankRoutingNumber}
                onChange={(e) => setData((p) => ({ ...p, bankRoutingNumber: e.target.value }))}
                placeholder="9-digit routing number"
                className="h-9 text-sm"
                maxLength={9}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Account Number</label>
              <Input
                value={data.bankAccountNumber}
                onChange={(e) => setData((p) => ({ ...p, bankAccountNumber: e.target.value }))}
                placeholder="Account number"
                className="h-9 text-sm"
                type="password"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Account Type</label>
              <select
                value={data.bankAccountType}
                onChange={(e) => setData((p) => ({ ...p, bankAccountType: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Defaults */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Invoice Defaults</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Default Payment Terms</label>
              <select
                value={data.invoicePaymentDays}
                onChange={(e) => setData((p) => ({ ...p, invoicePaymentDays: parseInt(e.target.value, 10) }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={15}>Net 15</option>
                <option value={30}>Net 30</option>
                <option value={45}>Net 45</option>
                <option value={60}>Net 60</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setData((p) => ({ ...p, proposalLogoWatermark: !p.proposalLogoWatermark }))}
                className="flex items-center gap-2 text-sm"
              >
                {data.proposalLogoWatermark ? (
                  <ToggleRight className="h-6 w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                )}
                <span className={data.proposalLogoWatermark ? "text-foreground font-medium" : "text-muted-foreground"}>
                  Company watermark on proposals
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Payment Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
