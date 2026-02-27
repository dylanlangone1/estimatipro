"use client"

import { useState, useRef, useCallback } from "react"
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function update<K extends keyof BlueprintParams>(key: K, value: BlueprintParams[K]) {
    setParams((p) => ({ ...p, [key]: value }))
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setUploadedFile(file)
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [".pdf"] },
    maxSize: 4 * 1024 * 1024,
    multiple: false,
  })

  async function runTakeoff() {
    setStep(1)
    setProgress(0)
    setAiReviewText("")
    setAudit(null)

    let aiData: Partial<BlueprintParams> | null = null

    if (uploadedFile) {
      setPhase("Uploading blueprint…")
      setProgress(5)
      try {
        const formData = new FormData()
        formData.append("file", uploadedFile)
        const res = await fetch("/api/ai/blueprint-analyze", { method: "POST", body: formData })
        if (res.ok) {
          const json = await res.json()
          const d = json.data ?? {}
          aiData = {
            sqft: d.totalSqft ?? params.sqft,
            stories: d.stories ?? params.stories,
            bedrooms: d.bedrooms ?? params.bedrooms,
            bathrooms: d.bathrooms ?? params.bathrooms,
            garageSize: d.garageSize ?? params.garageSize,
            roofType: (d.roofType ?? params.roofType) as BlueprintParams["roofType"],
            foundationType: (d.foundationType ?? params.foundationType) as BlueprintParams["foundationType"],
          }
          setParams((p) => ({ ...p, ...aiData }))
        }
      } catch {
        // Fall through to manual params
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
          const bp: BlueprintParams = aiData ? { ...params, ...aiData } : params
          const calcItems = calculateTakeoff(bp)
          const calcAudit = runAudit(calcItems, bp)
          setItems(calcItems)
          setAudit(calcAudit)
          setProgress(100)
          setTimeout(() => setStep(2), 300)
        }, 400)
      }
    }, 340)
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStep(0)
    setItems([])
    setAudit(null)
    setUploadedFile(null)
    setPreviewUrl(null)
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
    const rows = items.map(
      (it, i) =>
        `${i + 1},"${it.cat}","${it.name}",${it.quantity},${it.unit},$${it.cost.toFixed(2)},$${it.totalCost.toFixed(2)},${(it.confidence * 100).toFixed(0)}%`
    )
    const mt = items.reduce((s, r) => s + r.totalCost, 0)
    const csv = [header, ...rows, "", `TOTAL,,,,,,,$${mt.toFixed(2)}`].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = (params.projectName || "takeoff").replace(/\s/g, "_") + ".csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function sendToEstimate() {
    setSendingToEstimate(true)
    try {
      const res = await fetch("/api/ai/blueprint-to-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, projectInfo: params }),
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
      const res = await fetch("/api/ai/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: summary }),
      })
      const json = await res.json()
      setAiReviewText(json.answer ?? json.reply ?? "AI review unavailable.")
    } catch {
      setAiReviewText("AI review unavailable. Please try again.")
    }
    setAiReviewLoading(false)
  }

  // Derived values
  const categories = items.length ? ["All", ...Array.from(new Set(items.map((r) => r.cat)))] : []
  const filtered = categoryFilter === "All" ? items : items.filter((r) => r.cat === categoryFilter)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "cost") return b.totalCost - a.totalCost
    if (sortBy === "confidence") return a.confidence - b.confidence
    if (sortBy === "flags") return ((audit?.itemFlags[a.lid] ? 0 : 1) - (audit?.itemFlags[b.lid] ? 0 : 1))
    return a.cat.localeCompare(b.cat)
  })

  const materialTotal = items.reduce((s, r) => s + r.totalCost, 0)
  const laborTotal = materialTotal * 1.35
  const ohp = (materialTotal + laborTotal) * 0.18
  const grandTotal = materialTotal + laborTotal + ohp
  const psf = grandTotal / (params.sqft || 1)

  const catTotals: Record<string, number> = {}
  items.forEach((r) => { catTotals[r.cat] = (catTotals[r.cat] ?? 0) + r.totalCost })
  const maxCatTotal = Math.max(...Object.values(catTotals), 1)

  const circumference = 2 * Math.PI * 54

  // ── STEP 0: INPUT ──────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between py-5 mb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Ruler className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">
                <span className="text-white">EstimAI</span>{" "}
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Blueprint Takeoff</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">AI-Powered · 7-Layer Validated</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 tracking-wide">
            ● Residential
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            {/* Upload */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                Blueprint Upload
              </p>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-colors ${
                  uploadedFile
                    ? "border-green-500/60 bg-green-500/5"
                    : isDragActive
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-white/15 bg-white/2 hover:border-blue-400/60"
                }`}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div>
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-400">{uploadedFile.name}</p>
                    <p className="text-[10px] text-white/40 mt-1">
                      {(uploadedFile.size / 1024).toFixed(0)} KB ·{" "}
                      {uploadedFile.name.toLowerCase().endsWith(".pdf") || uploadedFile.type === "application/pdf" ? "PDF Blueprint" : "Image"} · Ready for AI
                    </p>
                    {previewUrl && (
                      <img src={previewUrl} alt="preview" className="max-h-28 mx-auto mt-3 rounded-lg opacity-70 object-contain" />
                    )}
                    {(uploadedFile.name.toLowerCase().endsWith(".pdf") || uploadedFile.type === "application/pdf") && (
                      <p className="text-4xl mt-3 opacity-40">📄</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-white/30 mx-auto mb-3" />
                    <p className="text-sm text-white/60">Drop blueprint or click to upload</p>
                    <p className="text-[10px] text-white/30 mt-1.5">PDF, PNG, JPG, WEBP · max 4MB — AI reads plans automatically</p>
                  </div>
                )}
              </div>
              {!uploadedFile && (
                <p className="mt-3 text-[11px] text-white/30 bg-white/3 rounded-lg px-3 py-2.5 leading-relaxed">
                  <span className="text-white/50 font-medium">No blueprint?</span> Enter specs manually in the fields below.
                </p>
              )}
            </div>

            {/* Project Info */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                Project Info
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5">Project Name</label>
                  <input
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    placeholder="e.g. Smith Residence"
                    value={params.projectName ?? ""}
                    onChange={(e) => update("projectName", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-white/40 mb-1.5">ZIP Code</label>
                    <input
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 transition-colors"
                      placeholder="04101"
                      value={params.zipCode ?? ""}
                      onChange={(e) => update("zipCode", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/40 mb-1.5">Sq Ft</label>
                    <input
                      type="number"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                      value={params.sqft}
                      onChange={(e) => update("sqft", +e.target.value)}
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
              <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                Building Specs
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5">Stories</label>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                    value={params.stories}
                    onChange={(e) => update("stories", +e.target.value)}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5">Beds</label>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                    value={params.bedrooms}
                    onChange={(e) => update("bedrooms", +e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5">Baths</label>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                    value={params.bathrooms}
                    onChange={(e) => update("bathrooms", +e.target.value)}
                  >
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5">Foundation</label>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                    value={params.foundationType}
                    onChange={(e) => update("foundationType", e.target.value as BlueprintParams["foundationType"])}
                  >
                    <option value="slab">Slab</option>
                    <option value="crawl">Crawl</option>
                    <option value="basement">Basement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5">Roof</label>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                    value={params.roofType}
                    onChange={(e) => update("roofType", e.target.value as BlueprintParams["roofType"])}
                  >
                    <option value="gable">Gable</option>
                    <option value="hip">Hip</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/40 mb-1.5">Garage</label>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-colors"
                    value={params.garageSize}
                    onChange={(e) => update("garageSize", +e.target.value)}
                  >
                    <option value={0}>None</option>
                    <option value={1}>1-Car</option>
                    <option value={2}>2-Car</option>
                    <option value={3}>3-Car</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 7-Layer Validation info */}
            <div className="bg-gradient-to-br from-card to-blue-950/30 border border-green-500/20 rounded-xl p-5">
              <p className="text-[10px] font-semibold tracking-widest text-green-400 uppercase mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> 7-Layer Validation Engine
              </p>
              <ul className="space-y-1.5 text-[12px] text-white/50 leading-relaxed">
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
                    <span className="text-blue-400/70 font-mono text-[10px]">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={runTakeoff}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition-all"
          >
            ✨ Generate &amp; Audit Takeoff
            <ChevronRight className="h-4 w-4" />
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
        <div className="flex items-center gap-3 py-5 mb-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Ruler className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Blueprint Takeoff</h1>
            <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">AI-Powered · 7-Layer Validated</p>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="relative w-36 h-36 mx-auto mb-8">
            <svg width="144" height="144" viewBox="0 0 144 144" className="absolute inset-0">
              <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <circle cx="72" cy="72" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
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
              <span className="text-3xl font-bold font-mono text-white">{progress}</span>
              <span className="text-sm text-white/40">%</span>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2 text-white">
            {uploadedFile ? "AI Analyzing Blueprint" : "Computing from Specs"}
          </h2>
          <p className="text-blue-400 text-sm min-h-5 mb-1">{phase}</p>
          <p className="text-white/30 text-[12px] animate-pulse">{params.sqft.toLocaleString()} SF</p>
        </div>
      </div>
    )
  }

  // ── STEP 2: RESULTS ───────────────────────────────────────────────────────
  const auditAlertCount = (audit?.errors ?? 0) + (audit?.warnings ?? 0)

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between py-5 mb-5 border-b border-white/10 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Ruler className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Blueprint Takeoff</h1>
            <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">AI-Powered · 7-Layer Validated</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {audit && (
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border tracking-wide ${
              audit.grade === "A" ? "bg-green-500/15 text-green-400 border-green-500/25" :
              audit.grade === "B" ? "bg-blue-500/15 text-blue-400 border-blue-500/25" :
              audit.grade === "C" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
              "bg-red-500/15 text-red-400 border-red-500/25"
            }`}>
              Audit: {audit.grade} ({audit.score}/100)
            </span>
          )}
          {uploadedFile && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
              🤖 AI Vision
            </span>
          )}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 text-white/60 text-[12px] font-medium hover:border-white/20 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> New
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">{params.projectName || "Residential"} — Material Takeoff</h2>
        <p className="text-[12px] text-white/30 mt-1">
          {params.sqft.toLocaleString()} SF · {params.bedrooms}BR/{params.bathrooms}BA · {items.length} items
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-black/20 border border-white/8 rounded-lg w-fit mb-6">
        {(["takeoff", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-[12px] font-semibold transition-colors ${
              activeTab === t ? "bg-card text-white shadow-sm" : "text-white/40 hover:text-white/70"
            }`}
          >
            {t === "takeoff" ? "Material Takeoff" : "🛡️ Audit"}
            {t === "audit" && auditAlertCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                (audit?.errors ?? 0) > 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
              }`}>
                {auditAlertCount}
              </span>
            )}
            {t === "audit" && auditAlertCount === 0 && audit && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-green-500/20 text-green-400">✓</span>
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
                audit.grade === "A" ? "border-green-400 text-green-400" :
                audit.grade === "B" ? "border-blue-400 text-blue-400" :
                audit.grade === "C" ? "border-amber-400 text-amber-400" :
                "border-red-400 text-red-400"
              }`}>
                {audit.grade}
              </div>
              <div>
                <p className="text-base font-bold text-white">Score: {audit.score}/100</p>
                <p className="text-[12px] text-white/40 mt-0.5">
                  {audit.errors} errors · {audit.warnings} warnings · {audit.flags.filter((f) => f.level === "pass").length} passed
                </p>
              </div>
              <div className="flex-1 min-w-40">
                <div className="h-2 bg-white/8 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${audit.score}%`,
                      background: audit.score >= 90 ? "#34d399" : audit.score >= 75 ? "#60a5fa" : audit.score >= 60 ? "#fbbf24" : "#f87171",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 7 layers */}
            <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-3">7 Validation Layers</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {audit.layers.map((ly, i) => (
                <div key={i} className="flex items-start gap-3 bg-black/20 border border-white/6 rounded-lg px-4 py-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[13px] ${
                    ly.status === "pass" ? "bg-green-500/15 text-green-400" :
                    ly.status === "warn" ? "bg-amber-500/15 text-amber-400" :
                    "bg-red-500/15 text-red-400"
                  }`}>
                    {ly.status === "pass" ? "✓" : ly.status === "warn" ? "⚠" : "✗"}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-white/80">
                      {["①","②","③","④","⑤","⑥","⑦"][i]} {ly.name}
                    </p>
                    <p className="text-[11px] text-white/35 mt-0.5">{ly.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">Findings ({audit.flags.length})</p>
              <div className="flex gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">{audit.errors} errors</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{audit.warnings} warns</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">{audit.flags.filter((f) => f.level === "pass").length} passed</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[...audit.flags.filter((f) => f.level === "error"), ...audit.flags.filter((f) => f.level === "warn"), ...audit.flags.filter((f) => f.level === "info"), ...audit.flags.filter((f) => f.level === "pass")].map((fl, i) => (
                <div key={i} className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-[12px] leading-relaxed ${
                  fl.level === "error" ? "bg-red-500/8 border border-red-500/20 text-red-300" :
                  fl.level === "warn" ? "bg-amber-500/8 border border-amber-500/20 text-amber-300" :
                  fl.level === "pass" ? "bg-green-500/8 border border-green-500/20 text-green-300" :
                  "bg-blue-500/8 border border-blue-500/20 text-blue-300"
                }`}>
                  <span className="flex-shrink-0 mt-0.5">
                    {fl.level === "error" ? <XCircle className="h-3.5 w-3.5" /> :
                     fl.level === "warn" ? <AlertTriangle className="h-3.5 w-3.5" /> :
                     fl.level === "pass" ? <CheckCircle className="h-3.5 w-3.5" /> :
                     <Info className="h-3.5 w-3.5" />}
                  </span>
                  <span>
                    <span className="font-semibold text-white/60">L{fl.layer}: </span>
                    {fl.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI second-pass review */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase mb-3">🤖 AI Second-Pass Review</p>
            <p className="text-[12.5px] text-white/50 mb-4 leading-relaxed">
              Send the entire takeoff to Claude for an independent review — it checks for missing materials, quantity errors, code compliance, and anything an experienced estimator would catch.
            </p>
            {!aiReviewText && (
              <button
                onClick={requestAiReview}
                disabled={aiReviewLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-amber-400/60 bg-amber-500/8 text-amber-300 font-semibold text-[13px] hover:bg-amber-500/15 transition-colors disabled:opacity-50"
              >
                {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "🤖"}
                {aiReviewLoading ? "Reviewing…" : "Request AI Estimator Review"}
              </button>
            )}
            {aiReviewText && (
              <div className="bg-gradient-to-br from-blue-950/40 to-indigo-950/30 border border-blue-500/20 rounded-lg p-4 text-[12.5px] text-blue-100/70 leading-relaxed whitespace-pre-wrap font-mono">
                <span className="text-blue-400 font-bold">🤖 AI Review:</span>{"\n\n"}{aiReviewText}
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
              { label: "Materials", value: fmt(materialTotal), sub: `${items.length} items` },
              { label: "Labor (1.35×)", value: fmt(laborTotal), sub: "Installation" },
              { label: "OH&P (18%)", value: fmt(ohp), sub: "Overhead & profit" },
              { label: "Grand Total", value: fmt(grandTotal), sub: `${fmt2(psf)}/SF`, gradient: true },
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
                <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase">{card.label}</p>
                <p className={`text-xl font-bold font-mono mt-1.5 ${card.gradient ? "bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent" : "text-white"}`}>
                  {card.value}
                </p>
                <p className="text-[10.5px] text-white/30 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Trade breakdown */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-4">Cost by Trade</p>
            <div className="space-y-2">
              {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-24 text-right flex-shrink-0">{cat}</span>
                  <div className="flex-1 h-[18px] bg-white/5 rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                      style={{ width: `${(val / maxCatTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10.5px] font-mono text-white/40 w-20 flex-shrink-0">{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>

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
                      : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  {c}{c !== "All" ? ` (${items.filter((r) => r.cat === c).length})` : ""}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Sort:</span>
              {([["category", "Category"], ["cost", "Cost ↓"], ["confidence", "Low Conf"], ["flags", "Flagged"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSortBy(val)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium border transition-colors ${
                    sortBy === val
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-white/10 text-white/40 hover:border-white/20"
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
                <tr className="border-b border-white/8 bg-black/20">
                  {["Material", "Qty", "Unit $", "Conf", "Total", ""].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-[10px] font-semibold tracking-wider text-white/30 uppercase text-left ${i === 4 ? "text-right" : ""} ${i === 5 ? "w-14 text-center" : ""}`}>
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
                      className={`border-b border-white/5 hover:bg-white/3 transition-colors ${
                        flagType === "error" ? "border-l-2 border-l-red-500" :
                        flagType === "warn" ? "border-l-2 border-l-amber-500" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {flagType && (
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${flagType === "error" ? "bg-red-400" : "bg-amber-400"}`} />
                          )}
                          <div>
                            <p className="text-[12.5px] font-medium text-white/85">{it.name}</p>
                            <p className="text-[10px] text-white/30">{it.cat}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {editingId === it.lid ? (
                          <input
                            type="number"
                            defaultValue={it.quantity}
                            autoFocus
                            className="w-16 px-1.5 py-1 bg-black/30 border border-blue-500/60 rounded text-[12px] font-mono text-white focus:outline-none"
                            onBlur={(e) => updateQty(it.lid, +e.target.value || it.quantity)}
                            onKeyDown={(e) => { if (e.key === "Enter") updateQty(it.lid, +(e.target as HTMLInputElement).value || it.quantity) }}
                          />
                        ) : (
                          <span className="font-mono text-[12.5px] text-white/70">
                            {it.quantity.toLocaleString()}
                            <span className="text-white/30 text-[10px] ml-1">{it.unit}</span>
                            {it.quantity !== it.rawQty && (
                              <span className="text-amber-400 text-[9px] ml-1.5">+{Math.round((it.waste - 1) * 100)}%</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-[12.5px] text-white/50">
                          {fmt2(it.cost)}<span className="text-white/25 text-[10px]">/{it.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-mono px-2 py-0.5 rounded-full ${
                          it.confidence >= 0.93 ? "bg-green-500/12 text-green-400" :
                          it.confidence >= 0.88 ? "bg-amber-500/12 text-amber-400" :
                          "bg-red-500/12 text-red-400"
                        }`}>
                          {(it.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono font-semibold text-[13px] text-blue-400">{fmt(it.totalCost)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => setEditingId(it.lid)}
                            className="p-1 rounded hover:bg-white/8 text-white/30 hover:text-white/70 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeItem(it.lid)}
                            className="p-1 rounded hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"
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
            <div className="text-[12.5px] text-white/40">
              Total:{" "}
              <span className="text-white text-[17px] font-bold font-mono">{fmt(grandTotal)}</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/12 text-white/60 text-[12.5px] font-medium hover:border-white/20 hover:text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> CSV
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
