"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  Search,
  Ruler,
  HardHat,
  Hammer,
  Sparkles,
  CheckCircle,
} from "lucide-react"

interface GenerationOverlayProps {
  isVisible: boolean
  isAiDone: boolean
  onComplete: () => void
  onCancel: () => void
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
    "Measuring countertops and cabinet runs...",
    "Pricing appliances and fixtures...",
    "Mapping plumbing and electrical rough-ins...",
    "Selecting backsplash and finish materials...",
    "Calculating demolition and waste removal...",
    "Sizing up the island layout...",
  ],
  bathroom: [
    "Measuring tile and waterproofing areas...",
    "Pricing fixtures, faucets, and vanities...",
    "Planning plumbing relocations...",
    "Calculating ventilation requirements...",
    "Selecting shower and tub specifications...",
  ],
  roof: [
    "Calculating roof area and pitch...",
    "Selecting roofing materials and underlayment...",
    "Pricing flashing and ridge vents...",
    "Factoring in tear-off and disposal...",
    "Checking for structural reinforcement needs...",
  ],
  deck: [
    "Sizing up the footprint and framing...",
    "Pricing decking materials and fasteners...",
    "Designing railing and stair systems...",
    "Calculating footer and foundation needs...",
    "Adding hardware and structural connectors...",
  ],
  basement: [
    "Evaluating moisture and waterproofing...",
    "Planning egress window locations...",
    "Sizing HVAC extensions and ductwork...",
    "Framing walls and dropping ceiling grids...",
    "Calculating electrical and lighting layout...",
  ],
  newbuild: [
    "Analyzing foundation and sitework...",
    "Pricing structural framing package...",
    "Planning mechanical, electrical, and plumbing...",
    "Estimating exterior envelope and insulation...",
    "Calculating finish materials and trim...",
  ],
  commercial: [
    "Reviewing commercial specifications...",
    "Pricing tenant improvement scope...",
    "Calculating code compliance requirements...",
    "Estimating HVAC and fire protection...",
    "Planning ADA and accessibility upgrades...",
  ],
  addition: [
    "Tying into existing structure...",
    "Pricing foundation and framing extension...",
    "Planning roof tie-in and weatherproofing...",
    "Matching existing finishes and materials...",
    "Calculating electrical panel and HVAC load...",
  ],
  remodel: [
    "Scoping demolition and protection...",
    "Pricing updated finishes and materials...",
    "Planning structural modifications...",
    "Calculating waste removal and dumpster needs...",
    "Matching existing systems and transitions...",
  ],
  general: [
    "Analyzing your project scope...",
    "Pricing materials and labor...",
    "Calculating quantities and waste factors...",
    "Building the line-item breakdown...",
    "Applying regional pricing adjustments...",
  ],
}

// ─── Rotating context messages (shown below the phase) ───
const CONTEXT_MESSAGES = [
  "This isn't a template — we're pricing every line item from scratch.",
  "Fun fact: The average contractor underestimates by 15-25%. We don't.",
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
  "Coffee not included in the estimate. That's on you. ☕",
  "This is what separates a guess from an estimate.",
  "We're checking your correction history to avoid past mistakes.",
  "Your pricing DNA is being woven into every calculation.",
  "A 200-line estimate in seconds — used to take hours by hand.",
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

  const PhaseIcon = currentIcon.Icon
  const phaseText = phases[phaseIndex] || "Building your estimate..."
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
