"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import {
  Upload,
  ChevronRight,
  ArrowLeft,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Pencil,
  X,
  Shield,
  Ruler,
  Loader2,
  Printer,
} from "lucide-react"
import { calculateTakeoff } from "@/lib/takeoff/calc-engine"
import { runAudit } from "@/lib/takeoff/audit-engine"
import type { TakeoffItem, BlueprintParams, AuditResult } from "@/types/takeoff"

const ANALYSIS_PHASES = [
  "Scanning blueprint scale…",
  "Detecting wall boundaries…",
  "Measuring room dimensions…",
  "Identifying openings…",
  "Classifying fixtures…",
  "Mapping electrical layout…",
  "Computing framing layout…",
  "Calculating roof area…",
  "Applying waste factors…",
  "Running 7-layer audit…",
]

const DEFAULT_PARAMS: BlueprintParams = {
  sqft: 2400,
  stories: 1,
  bedrooms: 3,
  bathrooms: 2,
  garageSize: 2,
  roofType: "gable",
  foundationType: "slab",
  projectName: "",
  zipCode: "",
}

function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US")
}

function fmt2(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// C5: CSV injection sanitization — prefix formula-starting characters with a single quote
function sanitizeCSV(val: string): string {
  const s = String(val)
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s
  return s.replace(/"/g, '""')
}

// M9: fetch with timeout (ms) — rejects if server doesn't respond in time
function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out after " + ms / 1000 + "s")), ms)
    fetch(url, opts)
      .then((r) => { clearTimeout(timer); resolve(r) })
      .catch((e) => { clearTimeout(timer); reject(e) })
  })
}

export function BlueprintTakeoff() {
  const router = useRouter()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [params, setParams] = useState<BlueprintParams>(DEFAULT_PARAMS)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState("")
  const [items, setItems] = useState<TakeoffItem[]>([])
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [activeTab, setActiveTab] = useState<"takeoff" | "audit">("takeoff")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [sortBy, setSortBy] = useState<"category" | "cost" | "confidence" | "flags">("category")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [sendingToEstimate, setSendingToEstimate] = useState(false)
  const [aiReviewText, setAiReviewText] = useState("")
  const [aiReviewLoading, setAiReviewLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  // C3: track whether blueprint-analyze API call succeeded or fell back to manual
  const [visionFailed, setVisionFailed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // H7: clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // H6: revoke preview object URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update<K extends keyof BlueprintParams>(key: K, value: BlueprintParams[K]) {
    setParams((p) => ({ ...p, [key]: value }))
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setUploadedFile(file)
    if (file.type.startsWith("image/")) {
      // H6: revoke previous URL before creating a new one
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
    } else {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  async function runTakeoff() {
    if (isRunning) return
    setIsRunning(true)
    setRunError(null)
    setVisionFailed(false)
    setStep(1)
    setProgress(0)
    setAiReviewText("")
    setAudit(null)

    // H5: Clamp sqft — NaN/0/<100 falls back to default; max 50,000
    const rawSqft = params.sqft
    const safeSqft = rawSqft > 0 && !Number.isNaN(rawSqft)
      ? Math.max(100, Math.min(50000, rawSqft))
      : DEFAULT_PARAMS.sqft
    const safeParams: BlueprintParams = { ...params, sqft: safeSqft }

    let aiData: Partial<BlueprintParams> | null = null

    if (uploadedFile) {
      setPhase("Uploading blueprint…")
      setProgress(5)
      try {
        const formData = new FormData()
        formData.append("file", uploadedFile)
        // M9: 60-second timeout for blueprint vision analysis
        const res = await fetchWithTimeout("/api/ai/blueprint-analyze", { method: "POST", body: formData }, 60_000)
        if (res.ok) {
          const json = await res.json()
          const d = json.data ?? {}
          aiData = {
            sqft:          d.totalSqft > 0 ? d.totalSqft : safeParams.sqft,
            stories:       d.stories       ?? safeParams.stories,
            bedrooms:      d.bedrooms      ?? safeParams.bedrooms,
            bathrooms:     d.bathrooms     ?? safeParams.bathrooms,
            garageSize:    d.garageSize    ?? safeParams.garageSize,
            roofType:      (d.roofType      ?? safeParams.roofType)      as BlueprintParams["roofType"],
            foundationType:(d.foundationType ?? safeParams.foundationType) as BlueprintParams["foundationType"],
          }
          setParams((p) => ({ ...p, ...aiData }))
        } else {
          const json = await res.json().catch(() => ({}))
          if (res.status === 403) {
            setIsRunning(false)
            setStep(0)
            setRunError(json.error ?? "Blueprint AI analysis requires a Standard plan or higher.")
            return
          }
          // Non-fatal API error — fall back to manual params, flag it
          setVisionFailed(true)
        }
      } catch {
        // Network / timeout error — fall back to manual params, flag it
        setVisionFailed(true)
      }
      setProgress(20)
    }

    let idx = 0
    intervalRef.current = setInterval(() => {
      idx++
      setProgress(Math.min(20 + idx * 8, 98))
      setPhase(ANALYSIS_PHASES[Math.min(idx - 1, 9)])
      if (idx >= 10) {
        clearInterval(intervalRef.current!)
        setTimeout(() => {
          try {
            const bp: BlueprintParams = aiData ? { ...safeParams, ...aiData } : safeParams
            const calcItems = calculateTakeoff(bp)
            const calcAudit = runAudit(calcItems, bp)
            setItems(calcItems)
            setAudit(calcAudit)
            setProgress(100)
            setIsRunning(false)
            setTimeout(() => setStep(2), 300)
          } catch (err) {
            console.error("[BlueprintTakeoff] Calculation error:", err)
            setIsRunning(false)
            setStep(0)
            setRunError(err instanceof Error ? err.message : "Calculation failed. Please try again.")
          }
        }, 400)
      }
    }, 340)
  }

  // M9: Cancel button handler — clears interval and returns to input
  function cancelTakeoff() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false)
    setStep(0)
    setProgress(0)
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false)
    setRunError(null)
    setVisionFailed(false)
    setStep(0)
    setItems([])
    setAudit(null)
    setUploadedFile(null)
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
    setProgress(0)
    setAiReviewText("")
    setCategoryFilter("All")
    setSortBy("category")
  }

  function updateQty(lid: number, newQty: number) {
    setItems((prev) => {
      const next = prev.map((r) =>
        r.lid === lid ? { ...r, quantity: newQty, totalCost: +(newQty * r.cost).toFixed(2) } : r
      )
      setAudit(runAudit(next, params))
      return next
    })
    setEditingId(null)
  }

  function removeItem(lid: number) {
    setItems((prev) => {
      const next = prev.filter((r) => r.lid !== lid)
      setAudit(runAudit(next, params))
      return next
    })
  }

  function exportCSV() {
    const header = "Line,Category,Material,Qty,Unit,Unit Cost,Total,Confidence"
    // C5: sanitize cat and name to prevent CSV formula injection
    const rows = items.map(
      (it, i) =>
        `${i + 1},"${sanitizeCSV(it.cat)}","${sanitizeCSV(it.name)}",${it.quantity},${it.unit},$${it.cost.toFixed(2)},$${it.totalCost.toFixed(2)},${(it.confidence * 100).toFixed(0)}%`
    )
    const mt  = items.reduce((s, r) => s + r.totalCost, 0)
    const csv = [header, ...rows, "", `TOTAL,,,,,,,$${mt.toFixed(2)}`].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = (params.projectName || "takeoff").replace(/\s/g, "_") + ".csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // M1: Print-ready PDF report (opens in new tab → browser print dialog)
  function exportPDF() {
    const mt  = items.reduce((s, r) => s + r.totalCost, 0)
    const lab = mt * 1.35
    const ohp = (mt + lab) * 0.18
    const gd  = mt + lab + ohp
    const rows = items
      .map(
        (it, i) =>
          `<tr><td>${i + 1}</td><td>${it.cat}</td><td>${it.name}</td>` +
          `<td style="text-align:right">${it.quantity.toLocaleString()} ${it.unit}</td>` +
          `<td style="text-align:right">$${it.cost.toFixed(2)}</td>` +
          `<td style="text-align:right">$${it.totalCost.toFixed(2)}</td>` +
          `<td style="text-align:center">${(it.confidence * 100).toFixed(0)}%</td></tr>`
      )
      .join("")
    const html =
      `<!DOCTYPE html><html><head><title>${params.projectName || "Takeoff"} – EstimAI</title>` +
      `<style>body{font-family:Arial,sans-serif;font-size:11px;max-width:960px;margin:0 auto;padding:24px}` +
      `h1{font-size:20px;margin-bottom:4px}p.sub{color:#666;font-size:11px;margin-bottom:16px}` +
      `table{width:100%;border-collapse:collapse}th,td{padding:5px 8px;border:1px solid #ddd;text-align:left}` +
      `th{background:#f5f5f5;font-size:10px;text-transform:uppercase;font-weight:600}` +
      `tfoot tr{font-weight:700;background:#f0f0f0}` +
      `.footer{color:#aaa;font-size:9px;text-align:center;margin-top:24px}</style></head><body>` +
      `<h1>${params.projectName || "Residential"} — Material Takeoff</h1>` +
      `<p class="sub">${params.sqft.toLocaleString()} SF · ${params.bedrooms}BR/${params.bathrooms}BA · ` +
      `${params.foundationType} foundation · ${params.roofType} roof · ${items.length} items · ` +
      `Generated ${new Date().toLocaleDateString()}</p>` +
      `<table><thead><tr><th>#</th><th>Trade</th><th>Material</th><th>Qty</th><th>Unit $</th><th>Total</th><th>Conf</th></tr></thead>` +
      `<tbody>${rows}</tbody>` +
      `<tfoot><tr><td colspan="3">Materials subtotal</td><td></td><td></td><td style="text-align:right">$${mt.toFixed(2)}</td><td></td></tr>` +
      `<tr><td colspan="3">Labor &amp; Installation (1.35×)</td><td></td><td></td><td style="text-align:right">$${lab.toFixed(2)}</td><td></td></tr>` +
      `<tr><td colspan="3">Overhead &amp; Profit (18%)</td><td></td><td></td><td style="text-align:right">$${ohp.toFixed(2)}</td><td></td></tr>` +
      `<tr style="background:#e8e8e8"><td colspan="3"><strong>GRAND TOTAL</strong></td><td></td><td></td>` +
      `<td style="text-align:right"><strong>$${gd.toFixed(2)}</strong></td><td></td></tr></tfoot></table>` +
      `<p class="footer">EstimAI Blueprint Takeoff · AI-Powered · 7-Layer Validated</p></body></html>`
    const w = window.open("", "_blank")
    if (w) {
      w.document.write(html)
      w.document.close()
      w.onload = () => w.print()
    }
  }

  async function sendToEstimate() {
    setSendingToEstimate(true)
    try {
      const res  = await fetch("/api/ai/blueprint-to-estimate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ items, projectInfo: params }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push(`/estimate/${json.estimateId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create estimate")
      setSendingToEstimate(false)
    }
  }

  async function requestAiReview() {
    setAiReviewLoading(true)
    const summary =
      `Review this ${params.sqft}SF residential takeoff (${params.bedrooms}BR/${params.bathrooms}BA, ` +
      `${params.foundationType} foundation, ${params.roofType} roof):\n\n` +
      items.map((it) => `${it.cat}: ${it.name} = ${it.quantity} ${it.unit} ($${it.totalCost.toFixed(2)}, conf ${(it.confidence * 100).toFixed(0)}%)`).join("\n") +
      `\n\nTotal materials: $${items.reduce((s, r) => s + r.totalCost, 0).toFixed(2)}\n\n` +
      `Review for: missing items, wrong quantities, code issues, duplicates. Be specific and concise.`

    try {
      // M9: 20-second timeout for AI review
      const res  = await fetchWithTimeout(
        "/api/ai/wizard",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: summary }) },
        20_000
      )
      const json = await res.json()
      setAiReviewText(json.answer ?? json.reply ?? "AI review unavailable.")
    } catch {
      setAiReviewText("AI review unavailable. Please try again.")
    }
    setAiReviewLoading(false)
  }

  // Derived values
  const categories = items.length ? ["All", ...Array.from(new Set(items.map((r) => r.cat)))] : []
  const filtered   = categoryFilter === "All" ? items : items.filter((r) => r.cat === categoryFilter)
  const sorted     = [...filtered].sort((a, b) => {
    if (sortBy === "cost")       return b.totalCost - a.totalCost
    if (sortBy === "confidence") return a.confidence - b.confidence
    if (sortBy === "flags")      return ((audit?.itemFlags[a.lid] ? 0 : 1) - (audit?.itemFlags[b.lid] ? 0 : 1))
    return a.cat.localeCompare(b.cat)
  })

  const materialTotal = items.reduce((s, r) => s + r.totalCost, 0)
  const laborTotal    = materialTotal * 1.35
  const ohp           = (materialTotal + laborTotal) * 0.18
  const grandTotal    = materialTotal + laborTotal + ohp
  const psf           = grandTotal / (params.sqft || 1)

  const catTotals: Record<string, number> = {}
  items.forEach((r) => { catTotals[r.cat] = (catTotals[r.cat] ?? 0) + r.totalCost })
  const maxCatTotal = Math.max(...Object.values(catTotals), 1)

  const circumference = 2 * Math.PI * 54

  // ── SHARED FIELD CLASSES ───────────────────────────────────────────────────
  const fieldCls = "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"

  // ── STEP 0: INPUT ──────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between py-5 mb-6 border-b border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Ruler className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                EstimAI{" "}
                <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">Blueprint Takeoff</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">AI-Powered · 7-Layer Validated</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 tracking-wide">
            ● Residential
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            {/* Upload */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                Blueprint Upload
              </p>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-colors ${
                  uploadedFile
                    ? "border-green-400 bg-green-50"
                    : isDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40"
                }`}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div>
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-700">{uploadedFile.name}</p>
                    <p className="text-[10px] text-muted mt-1">
                      {(uploadedFile.size / 1024).toFixed(0)} KB ·{" "}
                      {uploadedFile.name.toLowerCase().endsWith(".pdf") || uploadedFile.type === "application/pdf" ? "PDF Blueprint" : "Image"} · Ready for AI
                    </p>
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Blueprint preview"
                        className="max-h-28 mx-auto mt-3 rounded-lg opacity-80 object-contain"
                      />
                    )}
                    {(uploadedFile.name.toLowerCase().endsWith(".pdf") || uploadedFile.type === "application/pdf") && (
                      <p className="text-4xl mt-3 opacity-50">📄</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-foreground/70">Drop blueprint or click to upload</p>
                    <p className="text-[10px] text-muted mt-1.5">PDF, PNG, JPG, WEBP · max 10MB — AI reads plans automatically</p>
                  </div>
                )}
              </div>
              {!uploadedFile && (
                <p className="mt-3 text-[11px] text-muted bg-gray-50 border border-card-border rounded-lg px-3 py-2.5 leading-relaxed">
                  <span className="text-foreground font-medium">No blueprint?</span> Enter specs manually in the fields below.
                </p>
              )}
            </div>

            {/* Project Info */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                Project Info
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Project Name</label>
                  <input
                    className={fieldCls}
                    placeholder="e.g. Smith Residence"
                    value={params.projectName ?? ""}
                    onChange={(e) => update("projectName", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">ZIP Code</label>
                    <input
                      className={fieldCls}
                      placeholder="04101"
                      value={params.zipCode ?? ""}
                      onChange={(e) => update("zipCode", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Sq Ft</label>
                    {/* H5: clamp on change; enforce minimum on blur */}
                    <input
                      type="number"
                      min={100}
                      max={50000}
                      className={fieldCls}
                      value={params.sqft}
                      onChange={(e) => {
                        let v = +e.target.value
                        if (v > 50000) v = 50000
                        if (v < 0)     v = 0
                        update("sqft", v)
                      }}
                      onBlur={(e) => {
                        const v = +e.target.value
                        if (!v || v < 100) update("sqft", 100)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Building Specs */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                Building Specs
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Stories</label>
                  <select className={fieldCls} value={params.stories} onChange={(e) => update("stories", +e.target.value)}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Beds</label>
                  <select className={fieldCls} value={params.bedrooms} onChange={(e) => update("bedrooms", +e.target.value)}>
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Baths</label>
                  <select className={fieldCls} value={params.bathrooms} onChange={(e) => update("bathrooms", +e.target.value)}>
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Foundation</label>
                  <select className={fieldCls} value={params.foundationType} onChange={(e) => update("foundationType", e.target.value as BlueprintParams["foundationType"])}>
                    <option value="slab">Slab</option>
                    <option value="crawl">Crawl</option>
                    <option value="basement">Basement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Roof</label>
                  <select className={fieldCls} value={params.roofType} onChange={(e) => update("roofType", e.target.value as BlueprintParams["roofType"])}>
                    <option value="gable">Gable</option>
                    <option value="hip">Hip</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground/70 mb-1.5">Garage</label>
                  <select className={fieldCls} value={params.garageSize} onChange={(e) => update("garageSize", +e.target.value)}>
                    <option value={0}>None</option>
                    <option value={1}>1-Car</option>
                    <option value={2}>2-Car</option>
                    <option value={3}>3-Car</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 7-Layer Validation info */}
            <div className="bg-gradient-to-br from-card to-blue-50 border border-green-200 rounded-xl p-5">
              <p className="text-[10px] font-semibold tracking-widest text-green-700 uppercase mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> 7-Layer Validation Engine
              </p>
              <ul className="space-y-1.5 text-[12px] text-foreground/70 leading-relaxed">
                {[
                  "Overall $/SF vs RSMeans national benchmarks",
                  "Per-trade $/SF range validation (11 trades)",
                  "Cross-trade consistency (toilets=baths, GFCI, smoke)",
                  "Material ratio checks (nails:studs, compound:drywall)",
                  "Completeness — missing trades & essential equipment",
                  "Per-item confidence thresholds & reasonableness",
                  "Waste factor audit with total waste cost report",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-blue-600 font-mono text-[10px] font-semibold">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {runError && (
          <div className="mt-6 max-w-lg mx-auto bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 flex items-start gap-3">
            <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{runError}</span>
          </div>
        )}
        <div className="flex justify-center mt-6">
          <button
            onClick={runTakeoff}
            disabled={isRunning}
            aria-label="Generate and audit takeoff"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isRunning ? "Running…" : "✨ Generate & Audit Takeoff"}
            {!isRunning && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 1: ANALYZING ─────────────────────────────────────────────────────
  if (step === 1) {
    const dashOffset = circumference - (progress / 100) * circumference
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-3 py-5 mb-6 border-b border-card-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Ruler className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Blueprint Takeoff</h1>
            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">AI-Powered · 7-Layer Validated</p>
          </div>
        </div>

        <div className="text-center py-10">
          {/* L1: role="progressbar" + aria-valuenow for screen readers */}
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Analysis progress: ${progress}%`}
            className="relative w-36 h-36 mx-auto mb-8"
          >
            <svg width="144" height="144" viewBox="0 0 144 144" className="absolute inset-0">
              <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <circle cx="72" cy="72" r="54" fill="none" stroke="#E5E7EB" strokeWidth="3.5" />
              <circle
                cx="72"
                cy="72"
                r="54"
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.4s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono text-foreground">{progress}</span>
              <span className="text-sm text-muted">%</span>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2 text-foreground">
            {uploadedFile ? "AI Analyzing Blueprint" : "Computing from Specs"}
          </h2>
          <p className="text-blue-600 text-sm min-h-5 mb-1">{phase || (uploadedFile ? "Uploading blueprint…" : "Starting…")}</p>
          <p className="text-muted text-[12px] mb-6 animate-pulse">{params.sqft.toLocaleString()} SF</p>

          {/* Wait-time explanation */}
          {uploadedFile && progress <= 20 && (
            <div className="max-w-sm mx-auto bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-left space-y-2.5">
              <p className="text-[12px] font-semibold text-blue-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                Claude Vision is reading your blueprint
              </p>
              <p className="text-[11.5px] text-foreground/70 leading-relaxed">
                AI image analysis typically takes <span className="text-foreground font-medium">30–60 seconds</span>.
                Multi-page PDFs may take <span className="text-foreground font-medium">up to 5 minutes</span> depending on complexity.
              </p>
              <p className="text-[11px] text-muted flex items-center gap-1.5">
                <span>🔒</span>
                Keep this tab open — results appear automatically when ready.
              </p>
            </div>
          )}

          {uploadedFile && progress > 20 && (
            <p className="text-[11.5px] text-muted max-w-xs mx-auto leading-relaxed">
              AI extraction complete — computing {items.length > 0 ? "takeoff adjustments" : "material quantities"} &amp; running 7-layer audit…
            </p>
          )}

          {/* M9: Cancel button */}
          <button
            onClick={cancelTakeoff}
            className="mt-8 flex items-center gap-2 px-5 py-2 rounded-lg border border-card-border text-muted text-[12.5px] font-medium hover:border-gray-300 hover:text-foreground transition-colors mx-auto"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── STEP 2: RESULTS ───────────────────────────────────────────────────────
  const auditAlertCount = (audit?.errors ?? 0) + (audit?.warnings ?? 0)

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between py-5 mb-5 border-b border-card-border flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Ruler className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Blueprint Takeoff</h1>
            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">AI-Powered · 7-Layer Validated</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {audit && (
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border tracking-wide ${
              audit.grade === "A" ? "bg-green-100 text-green-700 border-green-200" :
              audit.grade === "B" ? "bg-blue-100 text-blue-700 border-blue-200" :
              audit.grade === "C" ? "bg-amber-100 text-amber-700 border-amber-200" :
              "bg-red-100 text-red-700 border-red-200"
            }`}>
              Audit: {audit.grade} ({audit.score}/100)
            </span>
          )}
          {/* C3: show appropriate badge based on whether vision succeeded */}
          {uploadedFile && !visionFailed && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              🤖 AI Vision
            </span>
          )}
          {uploadedFile && visionFailed && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              ⚠ Manual Fallback
            </span>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-card-border text-muted text-[12px] font-medium hover:border-gray-300 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> New
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground">{params.projectName || "Residential"} — Material Takeoff</h2>
        <p className="text-[12px] text-muted mt-1">
          {params.sqft.toLocaleString()} SF · {params.bedrooms}BR/{params.bathrooms}BA · {items.length} items
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-gray-100 border border-card-border rounded-lg w-fit mb-6">
        {(["takeoff", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-[12px] font-semibold transition-colors ${
              activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {t === "takeoff" ? "Material Takeoff" : "🛡️ Audit"}
            {t === "audit" && auditAlertCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                (audit?.errors ?? 0) > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              }`}>
                {auditAlertCount}
              </span>
            )}
            {t === "audit" && auditAlertCount === 0 && audit && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-green-100 text-green-700">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* ── AUDIT TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "audit" && audit && (
        <div className="space-y-4">
          {/* Score card */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="flex items-center gap-5 mb-5 flex-wrap">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black font-mono border-2 ${
                audit.grade === "A" ? "border-green-500 text-green-600" :
                audit.grade === "B" ? "border-blue-500 text-blue-600" :
                audit.grade === "C" ? "border-amber-500 text-amber-600" :
                "border-red-500 text-red-600"
              }`}>
                {audit.grade}
              </div>
              <div>
                <p className="text-base font-bold text-foreground">Score: {audit.score}/100</p>
                <p className="text-[12px] text-muted mt-0.5">
                  {audit.errors} errors · {audit.warnings} warnings · {audit.flags.filter((f) => f.level === "pass").length} passed
                </p>
              </div>
              <div className="flex-1 min-w-40">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${audit.score}%`,
                      background: audit.score >= 90 ? "#16a34a" : audit.score >= 75 ? "#2563eb" : audit.score >= 60 ? "#d97706" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 7 layers */}
            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-3">7 Validation Layers</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {audit.layers.map((ly, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 border border-card-border rounded-lg px-4 py-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[13px] font-bold ${
                    ly.status === "pass" ? "bg-green-100 text-green-700" :
                    ly.status === "warn" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {ly.status === "pass" ? "✓" : ly.status === "warn" ? "⚠" : "✗"}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {["①","②","③","④","⑤","⑥","⑦"][i]} {ly.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">{ly.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">Findings ({audit.flags.length})</p>
              <div className="flex gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">{audit.errors} errors</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">{audit.warnings} warns</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">{audit.flags.filter((f) => f.level === "pass").length} passed</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[...audit.flags.filter((f) => f.level === "error"), ...audit.flags.filter((f) => f.level === "warn"), ...audit.flags.filter((f) => f.level === "info"), ...audit.flags.filter((f) => f.level === "pass")].map((fl, i) => (
                <div key={i} className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-[12px] leading-relaxed ${
                  fl.level === "error" ? "bg-red-50 border border-red-200 text-red-700" :
                  fl.level === "warn" ? "bg-amber-50 border border-amber-200 text-amber-700" :
                  fl.level === "pass" ? "bg-green-50 border border-green-200 text-green-700" :
                  "bg-blue-50 border border-blue-200 text-blue-700"
                }`}>
                  <span className="flex-shrink-0 mt-0.5">
                    {fl.level === "error" ? <XCircle className="h-3.5 w-3.5" /> :
                     fl.level === "warn" ? <AlertTriangle className="h-3.5 w-3.5" /> :
                     fl.level === "pass" ? <CheckCircle className="h-3.5 w-3.5" /> :
                     <Info className="h-3.5 w-3.5" />}
                  </span>
                  <span>
                    <span className="font-semibold opacity-60">L{fl.layer}: </span>
                    {fl.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI second-pass review */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-3">🤖 AI Second-Pass Review</p>
            <p className="text-[12.5px] text-foreground/70 mb-4 leading-relaxed">
              Send the entire takeoff to Claude for an independent review — it checks for missing materials, quantity errors, code compliance, and anything an experienced estimator would catch.
            </p>
            {!aiReviewText && (
              <button
                onClick={requestAiReview}
                disabled={aiReviewLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-700 font-semibold text-[13px] hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "🤖"}
                {aiReviewLoading ? "Reviewing…" : "Request AI Estimator Review"}
              </button>
            )}
            {aiReviewText && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-[12.5px] text-blue-800 leading-relaxed whitespace-pre-wrap font-mono">
                <span className="text-blue-700 font-bold">🤖 AI Review:</span>{"\n\n"}{aiReviewText}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAKEOFF TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "takeoff" && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {[
              { label: "Materials",    value: fmt(materialTotal), sub: `${items.length} items` },
              { label: "Labor (1.35×)", value: fmt(laborTotal),    sub: "Installation" },
              { label: "OH&P (18%)",   value: fmt(ohp),            sub: "Overhead & profit" },
              { label: "Grand Total",  value: fmt(grandTotal),     sub: `${fmt2(psf)}/SF`, gradient: true },
            ].map((card, i) => (
              <div key={i} className="bg-card border border-card-border rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{
                  background: [
                    "linear-gradient(90deg,#3b82f6,#6366f1)",
                    "linear-gradient(90deg,#34d399,#10b981)",
                    "linear-gradient(90deg,#fbbf24,#f59e0b)",
                    "linear-gradient(90deg,#a855f7,#6366f1)",
                  ][i]
                }} />
                <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">{card.label}</p>
                <p className={`text-xl font-bold font-mono mt-1.5 ${card.gradient ? "bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent" : "text-foreground"}`}>
                  {card.value}
                </p>
                <p className="text-[10.5px] text-muted mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Trade breakdown */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-4">Cost by Trade</p>
            <div className="space-y-2">
              {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-[11px] text-foreground/70 w-24 text-right flex-shrink-0">{cat}</span>
                  <div className="flex-1 h-[18px] bg-gray-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                      style={{ width: `${(val / maxCatTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] font-mono text-muted w-20 flex-shrink-0">{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* M6: flooring note when takeoff is spec-based (no AI blueprint) */}
          {!uploadedFile && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-[11.5px] text-blue-700">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Flooring split (carpet / tile / LVP) is estimated from room counts. Upload a blueprint or adjust quantities in the table for your actual layout.</span>
            </div>
          )}

          {/* Category filter & sort */}
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    categoryFilter === c
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-card-border text-muted hover:border-gray-300 hover:text-foreground bg-card"
                  }`}
                >
                  {c}{c !== "All" ? ` (${items.filter((r) => r.cat === c).length})` : ""}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted uppercase tracking-wider">Sort:</span>
              {([["category", "Category"], ["cost", "Cost ↓"], ["confidence", "Low Conf"], ["flags", "Flagged"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSortBy(val)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium border transition-colors ${
                    sortBy === val
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-card-border text-muted hover:border-gray-300 hover:text-foreground bg-card"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Line item table */}
          <div className="border border-card-border rounded-xl overflow-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-card-border bg-gray-50">
                  {/* L1: scope="col" on all th elements */}
                  {["Material", "Qty", "Unit $", "Conf", "Total", ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`px-4 py-3 text-[10px] font-semibold tracking-wider text-muted uppercase text-left ${i === 4 ? "text-right" : ""} ${i === 5 ? "w-14 text-center" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((it) => {
                  const flagType = audit?.itemFlags[it.lid]
                  return (
                    <tr
                      key={it.lid}
                      className={`border-b border-card-border hover:bg-gray-50 transition-colors ${
                        flagType === "error" ? "border-l-2 border-l-red-500" :
                        flagType === "warn"  ? "border-l-2 border-l-amber-500" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {flagType && (
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${flagType === "error" ? "bg-red-500" : "bg-amber-500"}`} />
                          )}
                          <div>
                            <p className="text-[12.5px] font-medium text-foreground">{it.name}</p>
                            <p className="text-[10px] text-muted">{it.cat}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {editingId === it.lid ? (
                          <input
                            type="number"
                            defaultValue={it.quantity}
                            autoFocus
                            className="w-16 px-1.5 py-1 bg-white border border-blue-500 rounded text-[12px] font-mono text-foreground focus:outline-none"
                            onBlur={(e) => updateQty(it.lid, +e.target.value || it.quantity)}
                            onKeyDown={(e) => { if (e.key === "Enter") updateQty(it.lid, +(e.target as HTMLInputElement).value || it.quantity) }}
                          />
                        ) : (
                          <span className="font-mono text-[12.5px] text-foreground/80">
                            {it.quantity.toLocaleString()}
                            <span className="text-muted text-[10px] ml-1">{it.unit}</span>
                            {it.quantity !== it.rawQty && (
                              <span className="text-amber-600 text-[9px] ml-1.5">+{Math.round((it.waste - 1) * 100)}%</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[12.5px] text-foreground/70">
                          {fmt2(it.cost)}<span className="text-muted text-[10px]">/{it.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-mono px-2 py-0.5 rounded-full ${
                          it.confidence >= 0.93 ? "bg-green-100 text-green-700" :
                          it.confidence >= 0.88 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {(it.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono font-semibold text-[13px] text-blue-600">{fmt(it.totalCost)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 justify-center">
                          {/* L1: aria-label on icon-only buttons */}
                          <button
                            onClick={() => setEditingId(it.lid)}
                            aria-label="Edit quantity"
                            className="p-1 rounded hover:bg-gray-100 text-muted hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeItem(it.lid)}
                            aria-label="Remove item"
                            className="p-1 rounded hover:bg-red-50 text-muted hover:text-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between bg-card border border-card-border rounded-xl px-5 py-4 flex-wrap gap-3">
            <div className="text-[12.5px] text-muted">
              Total:{" "}
              <span className="text-foreground text-[17px] font-bold font-mono">{fmt(grandTotal)}</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-card-border text-muted text-[12.5px] font-medium hover:border-gray-300 hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              {/* M1: PDF export button */}
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-card-border text-muted text-[12.5px] font-medium hover:border-gray-300 hover:text-foreground transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> PDF
              </button>
              <button
                onClick={sendToEstimate}
                disabled={sendingToEstimate}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-[13px] shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {sendingToEstimate ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {sendingToEstimate ? "Creating Estimate…" : "→ Send to Estimate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
