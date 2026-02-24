import { mergeContextRules } from "./context-rule-engine"
import type { AIEstimateResponse } from "@/types/estimate"
import type { ContextRuleMatch, CoherenceResult, CoherenceWarning } from "@/types/training"

/**
 * Common construction synonyms/related terms for smarter matching.
 * If a required term has synonyms, we also check for those.
 */
const TERM_SYNONYMS: Record<string, string[]> = {
  "tear-off": ["tear off", "tearoff", "remove existing", "strip existing", "remove old", "removal"],
  "decking": ["deck boards", "deck surface", "deck material", "composite deck", "pt deck"],
  "railing": ["guardrail", "guard rail", "handrail", "hand rail", "baluster"],
  "flashing": ["flash", "step flash", "counter flash", "kick-out"],
  "ridge vent": ["ridge ventilation", "continuous vent", "attic vent"],
  "drip edge": ["drip-edge", "eave metal", "rake metal"],
  "underlayment": ["felt paper", "synthetic felt", "tar paper", "ice and water", "ice & water"],
  "sheathing": ["roof deck", "plywood deck", "osb deck", "roof sheathing"],
  "housewrap": ["house wrap", "tyvek", "weather barrier", "water resistive barrier", "wrb"],
  "soffit": ["soffit/fascia", "soffit & fascia", "soffit and fascia"],
  "gutters": ["gutter", "downspout", "rain gutter"],
  "egress": ["egress window", "escape window", "emergency window"],
  "waterproofing": ["waterproof", "moisture barrier", "vapor barrier", "kerdi", "schluter"],
  "gfci": ["gfi", "ground fault", "tamper resistant"],
  "backsplash": ["back splash", "wall tile", "kitchen tile"],
  "countertops": ["counter tops", "countertop", "counter top"],
  "cabinets": ["cabinetry", "cabinet"],
  "demolition": ["demo", "tear out", "tearout", "gut"],
  "drywall": ["sheetrock", "gypsum", "gypsum board", "wallboard"],
  "insulation": ["batt insulation", "spray foam", "blown-in", "rigid foam"],
  "permit": ["permits", "building permit", "inspection", "code compliance"],
  "contingency": ["contingency allowance", "unforeseen", "allowance for unknowns"],
  "cleanup": ["clean up", "clean-up", "final clean", "debris removal", "haul off", "haul-off"],
  "foundation": ["footing", "footings", "slab", "crawl space", "stem wall"],
  "framing": ["rough framing", "wall framing", "floor framing", "structural framing"],
  "siding": ["exterior cladding", "clapboard", "lap siding", "vinyl siding", "hardie", "fiber cement"],
  "hvac": ["heating", "cooling", "air conditioning", "furnace", "heat pump", "mini-split", "mini split"],
  "plumbing": ["plumbing rough", "plumbing finish", "water supply", "drain waste vent", "dwv"],
  "electrical": ["electrical rough", "electrical finish", "wiring", "panel", "receptacles", "outlets"],
  "painting": ["paint", "primer", "interior paint", "exterior paint", "staining"],
  "flooring": ["floor covering", "floor install", "lvp", "laminate", "hardwood", "tile floor", "carpet"],
  "trim": ["baseboard", "base molding", "crown molding", "casing", "door casing", "window casing"],
  "fixtures": ["light fixtures", "plumbing fixtures", "bath accessories", "hardware"],
  "landscaping": ["landscape", "grading", "topsoil", "seed", "sod", "plantings"],
  "driveway": ["paved driveway", "gravel driveway", "asphalt driveway", "concrete driveway"],
  "septic": ["septic system", "septic tank", "leach field", "drain field"],
  "well": ["drilled well", "dug well", "water well", "well pump"],
}

/**
 * Check if a required term matches against a text using synonyms.
 * Returns true if the required term or any of its synonyms appear in the text.
 */
function fuzzyTermMatch(required: string, text: string): boolean {
  const requiredLower = required.toLowerCase()
  const textLower = text.toLowerCase()

  // Direct bidirectional substring match
  if (textLower.includes(requiredLower) || requiredLower.includes(textLower)) {
    return true
  }

  // Check synonyms for the required term
  for (const [term, synonyms] of Object.entries(TERM_SYNONYMS)) {
    const termLower = term.toLowerCase()

    // If required matches this synonym group key
    if (requiredLower.includes(termLower) || termLower.includes(requiredLower)) {
      // Check if any synonym appears in the text
      if (synonyms.some((syn) => textLower.includes(syn.toLowerCase()))) {
        return true
      }
    }

    // If required matches one of the synonyms
    if (synonyms.some((syn) => requiredLower.includes(syn.toLowerCase()) || syn.toLowerCase().includes(requiredLower))) {
      // Check if the primary term or any other synonym appears in the text
      if (textLower.includes(termLower)) return true
      if (synonyms.some((syn) => textLower.includes(syn.toLowerCase()))) return true
    }
  }

  // Word-level overlap: split into words and check if key words match
  const requiredWords = requiredLower.split(/[\s\-\/&]+/).filter((w) => w.length > 2)
  const textWords = textLower.split(/[\s\-\/&]+/).filter((w) => w.length > 2)

  // If the required term has significant words and most appear in the text
  if (requiredWords.length > 0) {
    const matchCount = requiredWords.filter((rw) =>
      textWords.some((tw) => tw.includes(rw) || rw.includes(tw))
    ).length
    // If more than half the words match, count it
    if (matchCount >= Math.ceil(requiredWords.length * 0.6)) {
      return true
    }
  }

  return false
}

/**
 * Post-generation validation: cross-checks AI output against matched context rules.
 * Returns warnings for missing required categories, forbidden items, etc.
 */
export function validateEstimateCoherence(
  estimate: AIEstimateResponse,
  matchedRules: ContextRuleMatch[]
): CoherenceResult {
  if (matchedRules.length === 0) {
    return { passed: true, warnings: [], matchedRules: [] }
  }

  const merged = mergeContextRules(matchedRules)
  const warnings: CoherenceWarning[] = []

  // Extract all categories from line items (lowercase for comparison)
  const estimateCategories = estimate.lineItems.map((item) =>
    item.category.toLowerCase()
  )

  // Extract all line item descriptions
  const estimateDescriptions = estimate.lineItems.map((item) =>
    item.description.toLowerCase()
  )

  // Combine categories + descriptions for comprehensive checking
  const allEstimateText = [...estimateCategories, ...estimateDescriptions]

  // Extract assumptions
  const estimateAssumptions = (estimate.assumptions || []).map((a) =>
    a.toLowerCase()
  )

  // Also check notes for assumption content
  const estimateNotes = (estimate.notes || []).map((n) => n.toLowerCase())
  const allAssumptionText = [...estimateAssumptions, ...estimateNotes]

  // 1. mustInclude — check that required categories exist
  for (const required of merged.mustInclude) {
    const found = allEstimateText.some((text) =>
      fuzzyTermMatch(required, text)
    )
    if (!found) {
      const rule = matchedRules.find((r) =>
        r.mustInclude.some((m) => m.toLowerCase() === required.toLowerCase())
      )!
      warnings.push({
        type: "missing_category",
        message: `Missing required category: "${required}" (triggered by "${rule.triggerValue}" context rule)`,
        severity: "warning",
        autoFixable: false,
        rule,
      })
    }
  }

  // 2. mustExclude — check no forbidden items exist
  for (const excluded of merged.mustExclude) {
    const foundInText = allEstimateText.some((text) =>
      fuzzyTermMatch(excluded, text)
    )
    if (foundInText) {
      const rule = matchedRules.find((r) =>
        r.mustExclude.some((m) => m.toLowerCase() === excluded.toLowerCase())
      )!
      warnings.push({
        type: "excluded_item",
        message: `Found excluded item: "${excluded}" should not appear (triggered by "${rule.triggerValue}" context rule)`,
        severity: "error",
        autoFixable: false,
        rule,
      })
    }
  }

  // 3. mustAssume — check required assumptions exist
  for (const required of merged.mustAssume) {
    const found = allAssumptionText.some((text) =>
      fuzzyTermMatch(required, text)
    )
    // Also check line item descriptions — sometimes assumptions show up as line items
    const foundInItems = !found && allEstimateText.some((text) =>
      fuzzyTermMatch(required, text)
    )
    if (!found && !foundInItems) {
      const rule = matchedRules.find((r) =>
        r.mustAssume.some((m) => m.toLowerCase() === required.toLowerCase())
      )!
      warnings.push({
        type: "missing_assumption",
        message: `Missing required assumption: "${required}"`,
        severity: "warning",
        autoFixable: true,
        rule,
      })
    }
  }

  // 4. neverAssume — check forbidden assumptions don't exist
  for (const forbidden of merged.neverAssume) {
    const found = allAssumptionText.some((text) =>
      fuzzyTermMatch(forbidden, text)
    )
    if (found) {
      const rule = matchedRules.find((r) =>
        r.neverAssume.some((m) => m.toLowerCase() === forbidden.toLowerCase())
      )!
      warnings.push({
        type: "forbidden_assumption",
        message: `Forbidden assumption found: "${forbidden}" should not be assumed`,
        severity: "error",
        autoFixable: true,
        rule,
      })
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
    matchedRules,
  }
}
