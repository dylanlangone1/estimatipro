import type { TakeoffItem, BlueprintParams, AuditResult, AuditFlag, AuditLayer } from "@/types/takeoff"

export function runAudit(items: TakeoffItem[], params: Pick<BlueprintParams, "sqft" | "bathrooms" | "bedrooms" | "stories">): AuditResult {
  const sq = params.sqft ?? 2000
  const baths = params.bathrooms ?? 2
  const beds = params.bedrooms ?? 3

  const flags: AuditFlag[] = []
  const layers: AuditLayer[] = []
  const itemFlags: Record<number, "warn" | "error"> = {}

  const materialTotal = items.reduce((s, r) => s + r.totalCost, 0)
  const grandTotal = (materialTotal + materialTotal * 1.35) * 1.18
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
    Foundation: [3, 12],
    Framing: [12, 35],
    Exterior: [4, 14],
    Roofing: [2, 10],
    Drywall: [2, 8],
    Insulation: [1, 5],
    "Doors/Windows": [3, 15],
    Electrical: [4, 16],
    Plumbing: [5, 20],
    HVAC: [5, 22],
    Finishes: [8, 30],
  }
  let l2Warnings = 0
  Object.entries(benchmarks).forEach(([cat, [lo, hi]]) => {
    const c = catTotals[cat] ?? 0
    const cpsf = c / sq
    if (cpsf < lo * 0.5) {
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
  const exhaust = getQty("hv10")
  const smoke = getQty("el12")
  const gfci = getQty("el05")

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
  if (smoke < beds + 1) {
    l3Warnings++
    flags.push({ level: "warn", layer: 3, message: `Smoke detectors (${smoke}) < minimum (${beds} bedrooms + 1 per floor = ${beds + 1}).` })
  }
  if (gfci < baths + 2) {
    l3Warnings++
    flags.push({ level: "warn", layer: 3, message: `GFCIs (${gfci}) seem low. Need: ${Math.round(baths)} bath + 2 kitchen + 1 garage + 1 ext = ${Math.round(baths) + 4}.` })
  }
  if (l3Warnings === 0) {
    flags.push({ level: "pass", layer: 3, message: "All cross-trade fixture counts match." })
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
  const paint = getQty("fn01")
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
  const presentTrades = Object.keys(catTotals)
  const missingTrades = requiredTrades.filter((t) => !presentTrades.includes(t))
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
  flags.push({
    level: "info",
    layer: 7,
    message: `Total waste cost: $${Math.round(totalWasteCost).toLocaleString()} (${((totalWasteCost / materialTotal) * 100).toFixed(1)}% of materials).`,
  })
  layers.push({
    name: "Waste Factor Audit",
    status: l7Warnings > 5 ? "warn" : "pass",
    detail: `$${Math.round(totalWasteCost).toLocaleString()} waste (${((totalWasteCost / materialTotal) * 100).toFixed(1)}%)`,
  })

  const errors = flags.filter((f) => f.level === "error").length
  const warnings = flags.filter((f) => f.level === "warn").length
  const score = Math.max(0, Math.min(100, 100 - errors * 12 - warnings * 4))

  return {
    flags,
    layers,
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D",
    itemFlags,
    errors,
    warnings,
  }
}
