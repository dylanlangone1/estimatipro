/**
 * Converts structured input from Guided and Manual modes
 * into rich, natural-language project descriptions for the AI estimator.
 * The richer the description, the more accurate the estimate.
 */

import { QUALITY_LEVELS, COST_BENCHMARKS } from "@/lib/quality-levels"
import { PROJECT_TYPES } from "@/lib/project-types"
import { SCOPE_ITEMS } from "@/lib/scope-items"

interface GuidedInput {
  projectType: string
  trades: string[]
  sqft: string
  qualityLevel: string
  notes?: string
}

interface ManualInput {
  trades: string[]
  projectType: string
  scopeItems: string[]
  qualityLevel: string
  notes?: string
}

function getProjectLabel(key: string): string {
  return PROJECT_TYPES.find((p) => p.key === key)?.label || key
}

function getQualityInfo(key: string): { label: string; description: string } {
  const level = QUALITY_LEVELS.find((q) => q.key === key)
  return level
    ? { label: level.label, description: level.description }
    : { label: key, description: key }
}

function getCostBenchmark(projectType: string, qualityLevel: string): string | null {
  const benchmarks = COST_BENCHMARKS[projectType]
  if (!benchmarks) return null
  return benchmarks[qualityLevel] || null
}

/**
 * Returns the full list of typical scope items for a project type.
 * Used to tell the AI what to include even when the user doesn't list everything.
 */
function getTypicalScopeItems(projectType: string): string[] {
  return SCOPE_ITEMS[projectType] || []
}

/**
 * Project category: determines whether the project is working from scratch
 * or modifying an existing structure. This changes what utilities, site work,
 * and demolition items are needed.
 */
type ProjectCategory = "new_build" | "renovation" | "replacement" | "repair"

const PROJECT_CATEGORY: Record<string, ProjectCategory> = {
  kitchen_remodel: "renovation",
  bathroom_remodel: "renovation",
  full_home_renovation: "renovation",
  room_addition: "new_build", // hybrid — new structure tied into existing
  deck_patio: "new_build",
  basement_finish: "renovation",
  new_construction: "new_build",
  commercial_ti: "renovation",
  roof_replacement: "replacement",
  window_replacement: "replacement",
  siding_replacement: "replacement",
  electrical_panel_upgrade: "replacement",
  hvac_replacement: "replacement",
  custom_other: "renovation",
}

/**
 * Context text injected based on project category.
 * Tells the AI what's fundamentally different about this type of work.
 */
const CATEGORY_CONTEXT: Record<ProjectCategory, string> = {
  new_build: `PROJECT CATEGORY: NEW BUILD — Building from scratch or adding new structure. TURNKEY new homes cost $250-350/SF minimum for standard quality. Key considerations:
- UTILITIES: Water supply (drilled well $8K-20K, dug well $5K-12K, OR municipal water connection $3K-10K). Sewer (septic system with tank + leach field $15K-30K, OR municipal sewer connection $5K-12K). Electrical service from utility ($3K-7K). Gas service or propane tank ($2K-5K) if applicable.
- SITE WORK: Survey ($2K-5K), soil/perc test ($500-1500), clearing/stumping ($3K-15K), erosion control, grading ($5K-15K), access road. Tree removal if needed ($500-2500/tree).
- FOUNDATION: Full basement ($25-40/SF of footprint), crawl space ($12-20/SF), or slab on grade ($8-14/SF) — each has different cost implications. Full basement adds $30-50/SF to the build cost per SF of basement footprint.
- GARAGE: Attached garage adds ~$75/SF of garage footprint (includes slab, framing, siding, roofing, electrical, garage door, opener, concrete apron). Detached garage adds $85-100/SF. A typical 2-car garage (576 SF) = $40K-50K.
- DRIVEWAY: Gravel ($5-10/SF), asphalt ($6-12/SF), concrete ($10-18/SF). Include base prep, grading, and culvert if needed.
- PERMITS: Building permit, electrical permit, plumbing permit, septic permit (if applicable), driveway permit. If a project location is specified, use actual local permit fees for that jurisdiction. Otherwise use 1-3% of project cost. May need wetlands, zoning, or environmental review.
- Include ALL utility rough-ins and connections as separate line items.`,
  renovation: `PROJECT CATEGORY: RENOVATION / REMODEL — Working within an existing structure. Key considerations:
- EXISTING UTILITIES already in place — may need modification/upgrade, NOT new install (unless adding new fixtures/circuits).
- DEMOLITION of existing finishes required before new work. Include haul-off and dumpster ($500-800/load for 10-yd, $800-1200 for 20-yd).
- PROTECTION of existing finishes not being remodeled (floors, walls, furniture, fixtures) — $1.00-2.50/SF.
- MATCHING existing materials where new meets old (paint, flooring transitions, trim profiles).
- OCCUPIED SPACE: May need to work around homeowner's schedule. Consider dust barriers, temporary pathways.
- PRE-1978 HOMES: May need lead paint testing ($400-700) and/or asbestos testing ($300-800). If positive, abatement costs are significant ($5-25/SF).
- STRUCTURAL MODIFICATIONS may need engineering review ($800-3,000 for residential).
- SURPRISES: Budget 10% contingency — opening walls often reveals unexpected conditions (rot, outdated wiring, plumbing issues).`,
  replacement: `PROJECT CATEGORY: REPLACEMENT — Removing existing system and installing new. Key considerations:
- REMOVAL & DISPOSAL of existing materials (include dumpster/haul-off).
- INSPECTION of underlying structure once existing is removed (sheathing, framing, substrate condition).
- REPAIRS to underlying structure if damage found (allowance for sheathing replacement, framing repair, etc.).
- MATCHING existing adjacent work where new meets old.
- CODE UPGRADES: New installation must meet current code even if existing didn't (ice & water shield, arc-fault breakers, ventilation requirements, etc.).
- WARRANTY: New materials typically carry manufacturer warranty — note in assumptions.`,
  repair: `PROJECT CATEGORY: REPAIR — Fixing or restoring specific issues. Key considerations:
- DIAGNOSIS: Include time to assess and diagnose the problem.
- TARGETED WORK: Only repair what's needed, but include related items that will be disturbed.
- MATCHING: Must match existing materials, finishes, and quality. Matching can be harder and more expensive than full replacement.
- MINIMUM CHARGES: Most trades have a minimum service call / trip charge ($200-500).`,
}

/**
 * Project-type-specific guidance for the AI.
 * These are expert notes that help the AI produce accurate estimates.
 */
const PROJECT_GUIDANCE: Record<string, string> = {
  kitchen_remodel:
    "Include all demo, rough-in, finish work. Cabinets are typically 30-40% of budget. Counter SF = perimeter LF × depth (typically 25\"). Include backsplash, undercabinet lighting, GFCIs. Don't forget appliance hookups, plumbing connections, final trim. Gas line for range if needed.",
  bathroom_remodel:
    "Waterproofing is critical — include Kerdi or equivalent membrane. Tile includes backer board, thin-set, grout, and sealer. Include exhaust fan (code required), GFCI outlets, mirror, accessories. Shower/tub plumbing includes valve, trim, and head. Heated floor if selected.",
  full_home_renovation:
    "Phase the work logically: demo → structural → rough-in (MEP) → insulation → drywall → finish. Include temporary living considerations. HVAC ductwork modification is almost always needed. Don't forget smoke/CO detectors, arc-fault breakers. Lead/asbestos testing for pre-1978 homes.",
  room_addition:
    "Foundation (slab or crawl), structural tie-in to existing, roofing tie-in, siding match. Must include engineering/structural plans. Utility extensions (electric, plumbing, HVAC) to new space. Match existing finishes. Frost-depth footings required.",
  deck_patio:
    "Include footings/piers (below frost line), ledger board with flashing, post bases, beam/joist framing, decking, railings (code: 36\" min residential, 42\" commercial), stairs with stringers. Include staining/sealing if wood. Concrete patio includes base prep, forms, reinforcement, finishing.",
  basement_finish:
    "Address moisture first — include vapor barrier or dimple mat. Egress window required for bedrooms (code). Include sump pump if none exists. Ceiling options: drywall (cleaner) vs drop ceiling (access to mechanicals). Include bathroom rough-in if applicable. Radon mitigation if applicable.",
  new_construction:
    "TURNKEY NEW CONSTRUCTION costs $250-350/SF minimum for standard quality living space. Full scope from site work through CO. WATER SUPPLY: drilled well ($8K-20K) or dug well ($5K-12K) or municipal water connection ($3K-10K). SEWER: septic system with tank + leach field ($15K-30K, includes perc test & design) or municipal sewer connection ($5K-12K). POWER: electrical service drop/underground from utility ($3K-7K). Include survey ($2K-5K), clearing/stumping, excavation, foundation (full basement adds $25-40/SF of footprint), backfill/grading, framing ($15-25/SF), roofing ($600-900/SQ architectural), windows ($900-1400/EA mid-range), doors ($800-2500/EA exterior), siding ($10-18/SF Hardie), all MEP rough + finish, insulation (spray foam $2-4/SF, fiberglass $1.50-2.50/SF), drywall ($3-5/SF installed), flooring ($6-14/SF), cabinets ($200-500/LF mid-range), counters ($50-100/SF quartz), paint ($2-4/SF), trim, fixtures, appliances. GARAGE: Add $75/SF for attached garage (slab, framing, siding, roofing, electrical, door, opener, apron) — 2-car (576 SF) = $40K-50K. DRIVEWAY: paved (asphalt $6-12/SF, concrete $10-18/SF) or gravel ($5-10/SF). Landscaping: final grade, topsoil, seed/sod, plantings ($5K-15K). Permits: 2-4% of project cost.",
  commercial_ti:
    "Includes demo of existing, new framing/layout, all MEP to suit, fire protection/sprinkler mods, ceiling grid, flooring, ADA compliance (restrooms, clearances, signage). Prevailing wage may apply. Include architect/engineering fees if tenant responsibility. IT/low voltage rough-in.",
  roof_replacement:
    "Include: tear-off existing (1 or 2 layers), inspect/repair sheathing (allowance for OSB/plywood replacement), ice & water shield at eaves/valleys/penetrations, synthetic underlayment on field, drip edge at eaves and rakes, starter strip, field shingles, ridge cap, flashing at walls/pipes/vents/chimneys, ridge vent, pipe boots, step flashing. Include dumpster for tear-off debris. Assume permit required and inspection needed.",
  window_replacement:
    "Includes removal of existing, prep opening, install new window with shims, insulate gaps (low-expand foam), flash/weatherproof, interior trim/casing, exterior trim/caulk, painting touch-up. Price per window varies by size and type. Include egress compliance check for bedrooms. Storm windows if applicable.",
  siding_replacement:
    "Remove existing siding, inspect/repair sheathing, install housewrap (Tyvek or equivalent), install new siding, trim, soffit, fascia. Include flashing at all penetrations. Corner boards, window/door trim wrapping. Caulk and paint/finish. Material options: vinyl ($6-10/SF installed), fiber cement/Hardie ($10-18/SF installed), wood ($14-24/SF installed), stone veneer ($35-60/SF installed).",
  electrical_panel_upgrade:
    "200A standard for modern homes. Includes: disconnect with utility, remove old panel, install new panel and breakers, reconnect all circuits, label, ground rod, bonding. Include utility coordination and meter base if needed. Surge protection whole-house. Inspection required.",
  hvac_replacement:
    "Includes: disconnect/remove old equipment, install new indoor + outdoor units, refrigerant lines, thermostat, electrical connections, ductwork modifications if needed. Include line-set cover for mini-splits. Recovery/disposal of old refrigerant (EPA required). Zoning system if selected.",
  custom_other:
    "Break down into logical categories. Include all labor, materials, equipment, and overhead. Don't forget mobilization, permits, and cleanup.",
}

export function buildDescriptionFromGuided(input: GuidedInput): string {
  const parts: string[] = []

  // Project type + size
  const projectLabel = getProjectLabel(input.projectType)
  parts.push(`${projectLabel}, approximately ${input.sqft} square feet.`)

  // Project category context (new build vs renovation vs replacement)
  const category = PROJECT_CATEGORY[input.projectType] || "renovation"
  const categoryContext = CATEGORY_CONTEXT[category]
  if (categoryContext) {
    parts.push(categoryContext)
  }

  // Trades involved
  if (input.trades.length > 0) {
    parts.push(`Trades involved: ${input.trades.join(", ")}.`)
  }

  // Quality level with detail
  const quality = getQualityInfo(input.qualityLevel)
  parts.push(`Quality level: ${quality.label} (${quality.description.toLowerCase()}).`)

  // Cost benchmark for AI context
  const benchmark = getCostBenchmark(input.projectType, input.qualityLevel)
  if (benchmark) {
    parts.push(`Target cost range: ${benchmark} installed before markup.`)
  }

  // Typical scope items the AI should consider
  const typicalScope = getTypicalScopeItems(input.projectType)
  if (typicalScope.length > 0) {
    parts.push(`Typical scope includes: ${typicalScope.join(", ")}. Include all applicable items.`)
  }

  // Project-specific expert guidance
  const guidance = PROJECT_GUIDANCE[input.projectType]
  if (guidance) {
    parts.push(`Pro tips: ${guidance}`)
  }

  // Notes
  if (input.notes?.trim()) {
    parts.push(`Additional details from contractor: ${input.notes.trim()}`)
  }

  return parts.join(" ")
}

export function buildDescriptionFromManual(input: ManualInput): string {
  const parts: string[] = []

  // Project type
  const projectLabel = getProjectLabel(input.projectType)
  parts.push(`${projectLabel}.`)

  // Project category context (new build vs renovation vs replacement)
  const category = PROJECT_CATEGORY[input.projectType] || "renovation"
  const categoryContext = CATEGORY_CONTEXT[category]
  if (categoryContext) {
    parts.push(categoryContext)
  }

  // Selected scope items
  if (input.scopeItems.length > 0) {
    parts.push(`Selected scope of work: ${input.scopeItems.join(", ")}.`)
  }

  // Check for items in the typical scope NOT selected — mention them as excluded
  const typicalScope = getTypicalScopeItems(input.projectType)
  if (typicalScope.length > 0) {
    const excluded = typicalScope.filter(
      (item) => !input.scopeItems.some((s) => s.toLowerCase() === item.toLowerCase())
    )
    if (excluded.length > 0 && excluded.length < typicalScope.length) {
      parts.push(`NOT included in scope: ${excluded.join(", ")}.`)
    }
  }

  // Trades
  if (input.trades.length > 0) {
    parts.push(`Trades: ${input.trades.join(", ")}.`)
  }

  // Quality level with detail
  const quality = getQualityInfo(input.qualityLevel)
  parts.push(`Quality level: ${quality.label} (${quality.description.toLowerCase()}).`)

  // Cost benchmark
  const benchmark = getCostBenchmark(input.projectType, input.qualityLevel)
  if (benchmark) {
    parts.push(`Target cost range: ${benchmark} installed before markup.`)
  }

  // Project-specific expert guidance
  const guidance = PROJECT_GUIDANCE[input.projectType]
  if (guidance) {
    parts.push(`Pro tips: ${guidance}`)
  }

  // Notes
  if (input.notes?.trim()) {
    parts.push(`Additional details from contractor: ${input.notes.trim()}`)
  }

  return parts.join(" ")
}
