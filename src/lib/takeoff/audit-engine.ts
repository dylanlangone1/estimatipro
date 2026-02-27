import type { TakeoffItem, BlueprintParams, AuditResult, AuditFlag, AuditLayer } from "@/types/takeoff"

export function runAudit(items: TakeoffItem[], params: Pick<BlueprintParams, "sqft" | "bathrooms" | "bedrooms" | "stories">): AuditResult {
  // C2: Guard empty items — return a clear D grade instead of NaN/Infinity
  if (items.length === 0) {
    const emptyLayers: AuditLayer[] = [
      "Overall $/SF Benchmark", "Trade $/SF Ranges", "Cross-Trade Consistency",
      "Quantity Ratio Checks", "Completeness Check", "Item Reasonableness", "Waste Factor Audit",
    ].map((name) => ({ name, status: "fail" as const, detail: "No data" }))
    return {
      flags: [{ level: "error", layer: 5, message: "No items in takeoff. Generate a takeoff first." }],
      layers: emptyLayers,
      score: 0, grade: "D", itemFlags: {}, errors: 1, warnings: 0,
    }
  }

  const sq    = Math.max(1, params.sqft ?? 2000)  // C2: guard div/0
  const baths = params.bathrooms ?? 2
  const beds  = params.bedrooms ?? 3
  const stories = params.stories ?? 1              // H3: extract stories for smoke detector check

  const flags: AuditFlag[] = []
  const layers: AuditLayer[] = []
  const itemFlags: Record<number, "warn" | "error"> = {}

  const materialTotal = items.reduce((s, r) => s + r.totalCost, 0)
  const grandTotal = (materialTotal + materialTotal * 1.35) * 1.18
  // C2: sq is already clamped to min 1 above
  const psf = grandTotal / sq

  const catTotals: Record<string, number> = {}
  items.forEach((r) => {
    catTotals[r.cat] = (catTotals[r.cat] ?? 0) + r.totalCost
  })

  function getQty(id: string): number {
    const it = items.find((i) => i.id === id)
    return it ? it.quantity : 0
  }

  // Layer 1: Overall $/SF benchmark
  let l1Status: "pass" | "warn" | "fail" = "pass"
  if (psf < 100) {
    l1Status = "fail"
    flags.push({ level: "error", layer: 1, message: `Total $${psf.toFixed(0)}/SF is far below industry minimum ($100–120). Likely missing major trades.` })
  } else if (psf < 140) {
    l1Status = "warn"
    flags.push({ level: "warn", layer: 1, message: `$${psf.toFixed(0)}/SF is below national avg ($150–250). Check for missing items.` })
  } else if (psf > 350) {
    l1Status = "warn"
    flags.push({ level: "warn", layer: 1, message: `$${psf.toFixed(0)}/SF exceeds typical range. Check for duplicates.` })
  } else {
    flags.push({ level: "pass", layer: 1, message: `$${psf.toFixed(0)}/SF is within normal residential range ($150–250/SF).` })
  }
  layers.push({ name: "Overall $/SF Benchmark", status: l1Status, detail: `$${psf.toFixed(0)}/SF vs $150–250 national avg` })

  // Layer 2: Per-trade $/SF ranges
  const benchmarks: Record<string, [number, number]> = {
    Foundation:      [3, 12],
    Framing:         [12, 35],
    Exterior:        [4, 14],
    Roofing:         [2, 10],
    Drywall:         [2, 8],
    Insulation:      [1, 5],
    "Doors/Windows": [3, 15],
    Electrical:      [4, 16],
    Plumbing:        [5, 20],
    HVAC:            [5, 22],
    Finishes:        [8, 30],
  }
  let l2Warnings = 0
  Object.entries(benchmarks).forEach(([cat, [lo, hi]]) => {
    const c    = catTotals[cat] ?? 0
    const cpsf = c / sq
    // M4: Explicitly flag $0 trades (distinct from just being low)
    if (c === 0) {
      l2Warnings++
      flags.push({ level: "error", layer: 2, message: `${cat} has $0 — all items missing or removed. Expected $${lo}–$${hi}/SF.` })
    } else if (cpsf < lo * 0.5) {
      l2Warnings++
      flags.push({ level: "error", layer: 2, message: `${cat} is $${cpsf.toFixed(2)}/SF — below $${lo}–$${hi} benchmark. Missing items likely.` })
    } else if (cpsf < lo) {
      l2Warnings++
      flags.push({ level: "warn", layer: 2, message: `${cat} is $${cpsf.toFixed(2)}/SF, below $${lo}–$${hi} range.` })
    } else if (cpsf > hi * 1.5) {
      l2Warnings++
      flags.push({ level: "warn", layer: 2, message: `${cat} is $${cpsf.toFixed(2)}/SF, above $${lo}–$${hi} range.` })
    }
  })
  layers.push({
    name: "Trade $/SF Ranges",
    status: l2Warnings > 2 ? "fail" : l2Warnings > 0 ? "warn" : "pass",
    detail: l2Warnings > 0 ? `${l2Warnings} trades outside ranges` : "All 11 trades in range",
  })

  // Layer 3: Cross-trade consistency
  let l3Warnings = 0
  const toilets = getQty("pl06")
  const vanities = getQty("pl07")
  const exhaust  = getQty("hv10")
  const smoke    = getQty("el12")
  const gfci     = getQty("el05")

  if (toilets !== Math.round(baths)) {
    l3Warnings++
    flags.push({ level: "warn", layer: 3, message: `Toilets (${toilets}) ≠ bathrooms (${Math.round(baths)}). Should be 1:1.` })
  }
  if (vanities !== Math.round(baths)) {
    l3Warnings++
    flags.push({ level: "warn", layer: 3, message: `Vanities (${vanities}) ≠ bathrooms (${Math.round(baths)}).` })
  }
  if (exhaust !== Math.round(baths)) {
    l3Warnings++
    flags.push({ level: "warn", layer: 3, message: `Exhaust fans (${exhaust}) ≠ bathrooms (${Math.round(baths)}). Code requires 1 per bath.` })
  }
  // H3: smoke detector check includes stories (IRC: 1 per bedroom + 1 per floor + 1 common)
  const smokeNeeded = beds + stories + 1
  if (smoke < smokeNeeded) {
    l3Warnings++
    flags.push({ level: "warn", layer: 3, message: `Smoke detectors (${smoke}) < code minimum (${smokeNeeded}): ${beds} bedrooms + ${stories} floor(s) + 1 common.` })
  }
  // H2: GFCI code minimum — 1 per bath + 2 kitchen + 1 garage + 1 exterior + 1 laundry
  const gfciNeeded = Math.round(baths) + 5
  if (gfci < gfciNeeded) {
    l3Warnings++
    flags.push({ level: "warn", layer: 3, message: `GFCIs (${gfci}) below NEC minimum (${gfciNeeded}): ${Math.round(baths)} bath + 2 kitchen + 1 garage + 1 ext + 1 laundry.` })
  }
  if (l3Warnings === 0) {
    flags.push({ level: "pass", layer: 3, message: "All cross-trade fixture counts match code requirements." })
  }
  layers.push({
    name: "Cross-Trade Consistency",
    status: l3Warnings > 2 ? "fail" : l3Warnings > 0 ? "warn" : "pass",
    detail: l3Warnings > 0 ? `${l3Warnings} mismatches` : "All counts consistent",
  })

  // Layer 4: Quantity ratios
  let l4Warnings = 0
  const drywallSheets = items.filter((i) => i.id === "i01" || i.id === "i02").reduce((s, i) => s + i.quantity, 0)
  const jc = getQty("i03")
  if (drywallSheets > 0 && jc < Math.ceil(drywallSheets / 25)) {
    l4Warnings++
    flags.push({ level: "warn", layer: 4, message: `Joint compound (${jc} pails) low for ${drywallSheets} drywall sheets. Need ~1 per 25 sheets.` })
  }
  const studs = items.filter((i) => i.id === "r01" || i.id === "r02").reduce((s, i) => s + i.quantity, 0)
  const nails = getQty("r13")
  if (studs > 0 && nails < Math.ceil(studs / 200)) {
    l4Warnings++
    flags.push({ level: "warn", layer: 4, message: `Nail boxes (${nails}) low for ${studs} studs. ~1 box per 200 studs.` })
  }
  const paint  = getQty("fn01")
  const primer = getQty("fn02")
  if (paint > 0 && primer < Math.ceil(paint * 0.6)) {
    l4Warnings++
    flags.push({ level: "warn", layer: 4, message: `Primer (${primer} gal) low vs paint (${paint} gal). Need ~60–75% as much.` })
  }
  if (l4Warnings === 0) {
    flags.push({ level: "pass", layer: 4, message: "All material ratios check out." })
  }
  layers.push({
    name: "Quantity Ratio Checks",
    status: l4Warnings > 2 ? "fail" : l4Warnings > 0 ? "warn" : "pass",
    detail: l4Warnings > 0 ? `${l4Warnings} ratio issues` : "Ratios proportional",
  })

  // Layer 5: Completeness
  const requiredTrades = ["Foundation", "Framing", "Exterior", "Roofing", "Drywall", "Insulation", "Doors/Windows", "Electrical", "Plumbing", "HVAC", "Finishes"]
  const presentTrades  = Object.keys(catTotals)
  const missingTrades  = requiredTrades.filter((t) => !presentTrades.includes(t))
  if (missingTrades.length > 0) {
    flags.push({ level: "error", layer: 5, message: `Missing trades: ${missingTrades.join(", ")}.` })
  } else {
    flags.push({ level: "pass", layer: 5, message: "All 11 residential trades present." })
  }
  const essentials: [string, string][] = [["el09", "200A Panel"], ["pl12", "Water Heater"], ["hv01", "Furnace"]]
  const missingEssentials = essentials.filter(([id]) => getQty(id) === 0).map(([, name]) => name)
  if (missingEssentials.length > 0) {
    flags.push({ level: "error", layer: 5, message: `Missing essential equipment: ${missingEssentials.join(", ")}.` })
  }
  layers.push({
    name: "Completeness Check",
    status: missingTrades.length + missingEssentials.length > 0 ? "fail" : "pass",
    detail: missingTrades.length + missingEssentials.length > 0
      ? `${missingTrades.length + missingEssentials.length} items missing`
      : "All trades & essentials present",
  })

  // Layer 6: Item reasonableness
  let l6Warnings = 0
  items.forEach((it) => {
    if (it.confidence < 0.88) {
      l6Warnings++
      itemFlags[it.lid] = "warn"
      flags.push({ level: "warn", layer: 6, message: `${it.name} has low confidence (${(it.confidence * 100).toFixed(0)}%). Verify manually.` })
    }
    if (it.totalCost > 5000) {
      flags.push({ level: "info", layer: 6, message: `${it.name} is high-value ($${it.totalCost.toLocaleString()}). Double-check.` })
    }
  })
  if (l6Warnings === 0) {
    flags.push({ level: "pass", layer: 6, message: "All items within confidence thresholds." })
  }
  layers.push({
    name: "Item Reasonableness",
    status: l6Warnings > 3 ? "fail" : l6Warnings > 0 ? "warn" : "pass",
    detail: l6Warnings > 0 ? `${l6Warnings} low-confidence items` : "All items OK",
  })

  // Layer 7: Waste audit
  const totalWasteCost = items.reduce((s, it) => s + (it.quantity - it.rawQty) * it.cost, 0)
  let l7Warnings = 0
  items.forEach((it) => {
    const wastePercent = Math.round((it.waste - 1) * 100)
    if (wastePercent > 15) {
      l7Warnings++
      flags.push({ level: "info", layer: 7, message: `${it.name} has ${wastePercent}% waste factor (above average).` })
    }
  })
  // C2: Guard waste % calculation (materialTotal could be 0 if all items removed)
  const wastePct = materialTotal > 0 ? ((totalWasteCost / materialTotal) * 100).toFixed(1) : "0.0"
  flags.push({
    level: "info",
    layer: 7,
    message: `Total waste cost: $${Math.round(totalWasteCost).toLocaleString()} (${wastePct}% of materials).`,
  })
  layers.push({
    name: "Waste Factor Audit",
    status: l7Warnings > 5 ? "warn" : "pass",
    detail: `$${Math.round(totalWasteCost).toLocaleString()} waste (${wastePct}%)`,
  })

  const errors   = flags.filter((f) => f.level === "error").length
  const warnings = flags.filter((f) => f.level === "warn").length
  const score    = Math.max(0, Math.min(100, 100 - errors * 12 - warnings * 4))

  return {
    flags,
    layers,
    score,
    grade:    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D",
    itemFlags,
    errors,
    warnings,
  }
}
