"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  Search,
  Ruler,
  HardHat,
  Hammer,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

interface GenerationOverlayProps {
  isVisible: boolean
  isAiDone: boolean
  onComplete: () => void
  onCancel: () => void
  onRetry?: () => void
  generationError?: string | null
  retryStatus?: "idle" | "retrying" | "failed"
  projectContext?: string
}

// ─── Project type detection ───
type ProjectType =
  | "kitchen"
  | "bathroom"
  | "roof"
  | "deck"
  | "basement"
  | "newbuild"
  | "commercial"
  | "remodel"
  | "addition"
  | "general"

const PROJECT_KEYWORDS: Record<ProjectType, string[]> = {
  kitchen: ["kitchen", "cabinet", "countertop", "appliance", "backsplash", "island"],
  bathroom: ["bathroom", "bath", "shower", "tub", "vanity", "tile", "toilet"],
  roof: ["roof", "roofing", "shingle", "gutter", "flashing", "soffit", "fascia"],
  deck: ["deck", "patio", "pergola", "railing", "composite", "outdoor living"],
  basement: ["basement", "finish basement", "waterproof", "egress", "sump"],
  newbuild: ["new build", "new construction", "new home", "ground up", "custom home"],
  commercial: ["commercial", "office", "retail", "tenant", "buildout", "warehouse"],
  addition: ["addition", "add-on", "extension", "expand", "bump out"],
  remodel: ["remodel", "renovation", "renovate", "update", "rehab", "gut"],
  general: [],
}

function detectProjectType(ctx: string): ProjectType {
  if (!ctx) return "general"
  const lower = ctx.toLowerCase()
  for (const [type, keywords] of Object.entries(PROJECT_KEYWORDS)) {
    if (type === "general") continue
    if (keywords.some((kw) => lower.includes(kw))) return type as ProjectType
  }
  return "general"
}

// ─── Project-specific phase messages ───
const PHASE_MESSAGES: Record<ProjectType, string[]> = {
  kitchen: [
    "Parsing kitchen scope and identifying trade categories...",
    "Calculating cabinet linear footage and countertop square footage...",
    "Pricing appliances, sink, faucet, and fixture allowances...",
    "Mapping plumbing rough-in — supply, drain, and dishwasher connections...",
    "Calculating electrical circuits — dedicated appliance and GFCI outlets...",
    "Computing tile, backsplash, and flooring quantities with waste factors...",
    "Factoring demolition, debris removal, and protection costs...",
    "Applying regional labor rates for each trade...",
  ],
  bathroom: [
    "Parsing bathroom scope and fixture count...",
    "Computing tile square footage — floor, walls, and shower surround...",
    "Pricing fixtures, faucets, and vanity with hardware...",
    "Calculating plumbing rough-in — supply, drain, and vent stack...",
    "Sizing exhaust ventilation per code (CFM × room volume)...",
    "Computing waterproofing membrane and cement backer quantities...",
    "Applying waste factors for cut tile and mortar...",
    "Cross-referencing labor rates for tile and plumbing trades...",
  ],
  roof: [
    "Calculating roof area from pitch and footprint dimensions...",
    "Pricing architectural shingles by the square (100 SF)...",
    "Computing synthetic underlayment and ice & water shield quantities...",
    "Pricing drip edge, ridge vent, and step flashing linear footage...",
    "Factoring tear-off, haul-away, and disposal costs...",
    "Checking decking for replacement boards and sheathing repairs...",
    "Calculating ridge cap and starter strip quantities...",
    "Applying labor rates for roofing crew and equipment...",
  ],
  deck: [
    "Calculating deck footprint, ledger length, and joist spans...",
    "Pricing decking boards — linear footage with spacing factor...",
    "Computing beam and post sizes from span tables...",
    "Sizing concrete footers per frost depth and load...",
    "Calculating railing linear footage — posts, top rail, and balusters...",
    "Pricing stair stringers, treads, and risers...",
    "Adding structural hardware — joist hangers, post bases, lag screws...",
    "Factoring permit, inspection, and footing layout costs...",
  ],
  basement: [
    "Scoping moisture control — drainage mat, vapor barrier, sump pit...",
    "Calculating framing — stud walls on pressure-treated plate...",
    "Computing drywall square footage for walls and dropped ceiling...",
    "Sizing HVAC branch ducts and supply/return registers...",
    "Laying out electrical circuits, recessed lights, and egress lighting...",
    "Calculating egress window rough opening and well dimensions...",
    "Applying insulation R-value requirements for conditioned space...",
    "Cross-referencing permit requirements for finished basement...",
  ],
  newbuild: [
    "Computing foundation quantities — slab, stem wall, or basement per type...",
    "Pricing full framing package — dimensional lumber and engineered wood...",
    "Estimating plumbing rough-in — supply, DWV, and fixture count...",
    "Calculating electrical service — panel size, circuits, and rough-in wire...",
    "Sizing HVAC system — Manual J load calculation, equipment, and duct layout...",
    "Computing exterior envelope — wrap, siding, windows, roofing by square...",
    "Calculating insulation R-values — attic, wall cavity, and foundation...",
    "Pricing interior finishes — drywall, paint, flooring, trim, and fixtures...",
  ],
  commercial: [
    "Reviewing occupancy type and commercial code requirements...",
    "Scoping tenant improvement work by trade...",
    "Calculating ADA compliance — clearances, hardware, and signage...",
    "Estimating fire sprinkler coverage area and head count...",
    "Sizing HVAC for commercial occupancy load and outside air requirements...",
    "Computing electrical per NEC commercial — panel, circuits, and lighting...",
    "Pricing finish materials — ceiling grid, flooring, and partition systems...",
    "Applying prevailing wage and commercial labor rates by trade...",
  ],
  addition: [
    "Analyzing structural tie-in to existing foundation and framing...",
    "Computing new foundation extension — footings and stem wall...",
    "Calculating framing — floor system, walls, and roof tie-in...",
    "Sizing roof flashing and weatherproofing at existing wall connection...",
    "Calculating electrical panel capacity for added load...",
    "Sizing HVAC extension — duct branch, equipment load, and registers...",
    "Matching existing exterior finishes — siding, trim, and window style...",
    "Factoring permit, engineering review, and inspection costs...",
  ],
  remodel: [
    "Scoping selective demolition and structural protection...",
    "Calculating debris volume and dumpster haul-away costs...",
    "Pricing structural modifications — headers, beams, and shear walls...",
    "Computing updated finish material quantities with waste factors...",
    "Identifying concealed work allowances — behind walls and ceilings...",
    "Calculating trade sequencing — demo, rough-in, then finish order...",
    "Matching existing systems — electrical service, plumbing stack, HVAC...",
    "Applying temporary protection costs — dust walls, floor covering...",
  ],
  general: [
    "Parsing your project description and identifying scope...",
    "Breaking work down into trade categories...",
    "Computing material quantities with trade-specific waste factors...",
    "Pricing labor by trade using regional production rates...",
    "Applying overhead, markup, and permit allowances...",
    "Cross-referencing regional material costs for your market...",
    "Building the complete line-item breakdown...",
    "Reviewing quantities for completeness before finalizing...",
  ],
}

// ─── Rotating context messages (shown below the phase) ───
const CONTEXT_MESSAGES = [
  "This isn't a template — we're pricing every line item from scratch.",
  "The average contractor underestimates by 15–25%. We don't.",
  "Your pricing history makes every estimate smarter than the last.",
  "We're factoring in material waste, not just raw quantities.",
  "Each estimate is custom-built using real-world cost data.",
  "AI is cross-referencing labor rates for your region right now.",
  "No two projects are the same — that's why templates fail.",
  "We're including items most contractors forget to bid.",
  "Your estimate includes overhead that most competitors miss.",
  "Every line item gets independently priced — no generic allowances.",
  "We calculate labor hours based on actual production rates.",
  "Your brand rules and preferences are being applied right now.",
  "Material quantities include standard waste factors per trade.",
  "We price permits based on your project's jurisdiction.",
  "Good estimates win jobs. Bad estimates lose money. We build good ones.",
  "This is what separates a guess from an estimate.",
  "We're checking your correction history to avoid past mistakes.",
  "Your pricing DNA is being woven into every calculation.",
  "A 200-line estimate in seconds — used to take hours by hand.",
  "We apply your markup percentage to every line item automatically.",
  "Labor costs are calculated using trade-specific production rates.",
  "Regional cost indexes are applied to match your local market.",
  "Every estimate cross-references over 10,000 material line items.",
  "We cross-check every number — because 'close enough' costs you money.",
  "Your competitors are still using spreadsheets. You're not.",
  "Somewhere a contractor just guessed on a bid. You didn't.",
]

// Shuffle array (Fisher-Yates) — returns a new shuffled copy
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ─── Phase icon mapping by progress ───
const phaseIcons = [
  { min: 0, max: 20, Icon: Search },
  { min: 20, max: 40, Icon: Ruler },
  { min: 40, max: 60, Icon: HardHat },
  { min: 60, max: 80, Icon: Hammer },
  { min: 80, max: 95, Icon: Sparkles },
  { min: 95, max: 100, Icon: CheckCircle },
]

export function GenerationOverlay({
  isVisible,
  isAiDone,
  onComplete,
  onCancel,
  onRetry,
  generationError = null,
  retryStatus = "idle",
  projectContext = "",
}: GenerationOverlayProps) {
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [contextIndex, setContextIndex] = useState(0)
  const [contextFading, setContextFading] = useState(false)

  const onCompleteRef = useRef(onComplete)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Detect project type and get shuffled messages
  const projectType = useMemo(() => detectProjectType(projectContext), [projectContext])
  const phases = useMemo(() => shuffle(PHASE_MESSAGES[projectType]), [projectType])
  const contextMessages = useMemo(() => shuffle(CONTEXT_MESSAGES), [])

  // Progress simulation
  useEffect(() => {
    if (!isVisible) {
      setProgress(0)
      setExiting(false)
      setPhaseIndex(0)
      setContextIndex(0)
      hasCompletedRef.current = false
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isAiDone) return Math.min(prev + 4, 100)
        if (prev < 20) return prev + 1.2
        if (prev < 45) return prev + 0.6
        if (prev < 65) return prev + 0.35
        if (prev < 80) return prev + 0.15
        if (prev < 92) return prev + 0.08
        return Math.min(prev + 0.02, 94)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isVisible, isAiDone])

  // Rotate phase messages every 3.5s
  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length)
    }, 3500)

    return () => clearInterval(interval)
  }, [isVisible, phases.length])

  // Rotate context messages every 4.5s with fade
  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setContextFading(true)
      setTimeout(() => {
        setContextIndex((prev) => (prev + 1) % contextMessages.length)
        setContextFading(false)
      }, 300)
    }, 4500)

    return () => clearInterval(interval)
  }, [isVisible, contextMessages.length])

  // Handle completion when progress hits 100
  useEffect(() => {
    if (progress >= 100 && isVisible && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      setExiting(true)
      setTimeout(() => {
        onCompleteRef.current()
      }, 500)
    }
  }, [progress, isVisible])

  // Get current phase icon
  const currentIcon = useMemo(() => {
    for (let i = phaseIcons.length - 1; i >= 0; i--) {
      if (progress >= phaseIcons[i].min) return phaseIcons[i]
    }
    return phaseIcons[0]
  }, [progress])

  const handleCancel = useCallback(() => {
    onCancel()
  }, [onCancel])

  if (!isVisible) return null

  // ── Error state: overlay stays visible with retry/cancel options ──
  if (generationError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/95 backdrop-blur-sm animate-fade-in">
        <div className="max-w-lg w-full mx-4 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Generation Failed</h2>
          <p className="text-sm text-white/60 mb-8 px-6">{generationError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-brand-orange hover:opacity-90 text-white font-semibold transition-opacity mb-4"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
          <br />
          <button
            onClick={handleCancel}
            className="text-sm text-white/30 hover:text-white/60 transition-colors mt-2"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const PhaseIcon = currentIcon.Icon
  // Show retrying message during client-side auto-retry
  const phaseText = retryStatus === "retrying"
    ? "AI is busy — trying again automatically..."
    : phases[phaseIndex] || "Building your estimate..."
  const contextText = contextMessages[contextIndex] || ""

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/95 backdrop-blur-sm ${
        exiting ? "animate-fade-out" : "animate-fade-in"
      }`}
    >
      <div className="max-w-lg w-full mx-4 text-center">
        {/* Phase icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-orange/20 mb-4">
            <PhaseIcon
              className="h-10 w-10 text-brand-orange"
              style={{ animation: "buildPulse 2s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Phase text — project-specific */}
        <h2
          key={phaseText}
          className="text-xl font-semibold text-white mb-2 animate-fade-in"
        >
          {phaseText}
        </h2>

        {/* Rotating context message */}
        <p
          className={`text-sm text-white/50 mb-8 h-10 flex items-center justify-center px-6 transition-opacity duration-300 ${
            contextFading ? "opacity-0" : "opacity-100"
          }`}
        >
          {contextText}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden mb-3">
          <div
            className="h-full bg-brand-orange rounded-full transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 10px rgba(233, 69, 96, 0.5)",
            }}
          />
        </div>

        {/* Progress percentage */}
        <p className="text-xs text-white/40 tabular-nums mb-10">
          {Math.round(progress)}%
        </p>

        {/* Cancel */}
        {!isAiDone && (
          <button
            onClick={handleCancel}
            className="text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
