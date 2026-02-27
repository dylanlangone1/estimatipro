import type { TakeoffItem, BlueprintParams } from "@/types/takeoff"
import { getMaterial } from "./material-db"

export function calculateTakeoff(bp: BlueprintParams): TakeoffItem[] {
  const items: TakeoffItem[] = []
  let lid = 0

  function add(mid: string, rawQty: number, confidence?: number) {
    const m = getMaterial(mid)
    if (!m || rawQty <= 0) return
    const raw = Math.ceil(rawQty)
    const qty = Math.ceil(rawQty * m.waste)
    // H1: Deterministic confidence (no Math.random — same spec = same result every run)
    const detConf = 0.90 + ((mid.charCodeAt(0) * 7 + mid.charCodeAt(mid.length - 1) * 13) % 80) / 1000
    items.push({
      ...m,
      lid: ++lid,
      rawQty: raw,
      quantity: qty,
      totalCost: +(qty * m.cost).toFixed(2),
      confidence: confidence ?? detConf,
    })
  }

  // C2: Clamp sqft to valid range (100–50,000)
  const sq  = Math.max(100, Math.min(50000, bp.sqft ?? 2000))
  const st  = bp.stories ?? 1
  const fp  = sq / st                  // footprint SF (per story)
  const per = Math.sqrt(fp) * 4        // exterior perimeter LF (assumes square-ish footprint)
  // Interior partition walls: ~0.13 LF per SF of floor area (≈260 LF for 2,000 SF house)
  // Industry benchmark: 1 LF per 7–8 SF. Previous 0.35 was 3× too high.
  const iw  = sq * 0.13
  const ch  = 9                        // ceiling height ft
  const ewSF = per * ch * st           // exterior wall surface SF
  const iwSF = iw * ch                 // interior wall surface SF
  const twSF = ewSF + iwSF             // total wall surface SF
  const rSF  = fp * (bp.roofType === "hip" ? 1.25 : bp.roofType === "gable" ? 1.18 : 1.05)
  const rSQ  = rSF / 100               // roof area in squares (100 SF each)
  const baths = bp.bathrooms ?? 2
  const beds  = bp.bedrooms ?? 3
  const fb    = Math.floor(baths)
  const isSlab = bp.foundationType === "slab"

  // ── Foundation (M3: branching by foundation type) ────────────────────────────
  if (bp.foundationType === "basement") {
    // Basement: perimeter foundation walls (8 ft tall) + floor slab + waterproofing
    add("f02", fp, 0.95)                       // basement floor slab
    add("f05", fp, 0.94)                       // gravel under slab
    add("f04", fp + per * 8, 0.93)             // vapor barrier (floor + 8 ft walls)
    add("f03", per * 8 + fp * 0.5, 0.91)       // rebar (walls + floor)
    add("f08", fp, 0.92)                       // wire mesh (floor)
    add("f06", Math.ceil(per / 4), 0.95)       // anchor bolts
    add("f07", per * 2, 0.91)                  // form boards (more for tall walls)
  } else if (bp.foundationType === "crawl") {
    // Crawl space: stem walls (~3 ft tall) + ground vapor barrier
    add("f02", per * 3 * 0.67, 0.93)           // stem wall concrete (3 ft tall, 8" wide → SF equiv)
    add("f04", fp, 0.94)                       // vapor barrier on ground
    add("f03", per * 1.5, 0.92)               // rebar in stem walls
    add("f06", Math.ceil(per / 4), 0.95)       // anchor bolts
    add("f07", per, 0.92)                      // form boards
  } else {
    // Slab-on-grade (default)
    add("f02", fp, 0.96)                       // concrete slab (SF)
    add("f05", fp, 0.95)                       // gravel base
    add("f04", fp, 0.94)                       // vapor barrier
    add("f03", fp * 0.5, 0.93)                // #4 rebar (approx LF)
    add("f08", fp, 0.93)                       // wire mesh
    add("f06", Math.ceil(per / 4), 0.95)       // anchor bolts every 4 ft
    add("f07", per, 0.92)                      // form boards (perimeter LF)
  }

  // ── Framing ──────────────────────────────────────────────────────────────────
  // Per IRC R602: exterior walls must be 2×6 where energy code requires R-20+
  // Interior non-load-bearing partitions remain 2×4.
  const es  = (per * 12) / 16 * st * 1.15  // exterior stud count at 16" OC + 15% for corners/kings/jacks
  const is2 = (iw  * 12) / 16 * 1.10       // interior stud count at 16" OC + 10% for intersections
  add("r02", es,  0.94)                     // exterior 2×6 studs
  add("r01", is2, 0.94)                     // interior 2×4 partition studs
  add("r04", per * 3, 0.95)                 // exterior 2×6 plates (bottom + 2 top)
  add("r03", iw  * 3, 0.95)                 // interior 2×4 plates (bottom + 2 top)
  const openingCount = 2 + 8 + Math.ceil(sq / 170)  // ext doors + int doors + windows
  add("r05", openingCount * 5,   0.93)      // 2×10 header LF (avg 5 LF per opening)
  add("r06", per * 0.3,          0.91)      // 2×12 ridge board LF
  add("r07", ewSF + rSF,         0.95)      // OSB sheathing (walls + roof deck)
  add("r08", Math.ceil(Math.sqrt(fp) / 2), 0.91) // roof trusses at 24" OC
  // Floor joists: only for crawlspace or basement (slab has no floor joists)
  // Formula: fp * 0.065 ≈ 130 joists for 2,000 SF. Previous fp/1.33 treated SF as LF → 1,504 (wrong!)
  if (!isSlab) {
    add("r09", Math.ceil(fp * 0.065), 0.94) // 2×10 floor joists
    add("r11", Math.ceil(fp * 0.065), 0.93) // joist hangers (1:1 with joists)
  }
  add("r10", Math.sqrt(fp) * 0.4, 0.9)     // LVL beam LF
  add("r13", Math.ceil(sq / 350), 0.91)    // 16d nails (1 box per ~350 SF)

  // ── Exterior ─────────────────────────────────────────────────────────────────
  add("e01", ewSF * 0.85, 0.93)  // siding (85% of gross wall — less openings)
  add("e02", ewSF,        0.96)  // house wrap (full gross wall)
  add("e03", per,         0.94)  // vented soffit LF
  add("e04", per,         0.95)  // aluminum fascia LF

  // ── Roofing ──────────────────────────────────────────────────────────────────
  add("rf01", rSQ,            0.94)  // architectural shingles (squares)
  add("rf02", rSQ,            0.95)  // synthetic underlayment
  add("rf03", per * 1.1,      0.96)  // drip edge LF (slightly > footprint perimeter)
  add("rf04", Math.sqrt(fp),  0.94)  // ridge vent LF
  add("rf05", per * 3,        0.93)  // ice & water shield SF (3 ft wide × perimeter)

  // ── Drywall ──────────────────────────────────────────────────────────────────
  add("i01", Math.ceil(twSF / 48), 0.95)   // ½" wall drywall (4×12 = 48 SF/sheet)
  add("i02", Math.ceil(fp   / 48), 0.94)   // ⅝" ceiling drywall
  add("i03", Math.ceil(twSF / 400), 0.92)  // joint compound (1 pail per ~400 SF)
  add("i04", Math.ceil(twSF / 500), 0.93)  // paper tape rolls
  add("i05", Math.ceil(twSF / 300), 0.91)  // drywall screws boxes

  // ── Insulation ───────────────────────────────────────────────────────────────
  add("n01", fp,    0.94)  // R-38 attic batt (full footprint SF)
  add("n04", ewSF,  0.95)  // R-21 exterior wall batt (2×6 cavity)

  // ── Doors & Windows ──────────────────────────────────────────────────────────
  add("dw01", 2,                   0.97)  // exterior steel doors (front + back)
  add("dw04", beds + baths + 3,    0.95)  // interior pre-hung doors
  add("dw05", beds + 1,            0.94)  // bi-fold closet doors
  add("dw06", Math.ceil(sq / 170), 0.94)  // double-hung windows
  // M2: garage doors split by size
  if (bp.garageSize === 1) add("dw11", 1, 0.98)  // 9×7 single-car garage door
  if (bp.garageSize >= 2) add("dw10", 1, 0.98)   // 16×7 double-car garage door

  // ── Electrical ───────────────────────────────────────────────────────────────
  const oc = Math.ceil(sq / 55)  // outlet circuits
  add("el01", sq * 1.2,               0.9)   // 14/2 NM-B wire LF
  add("el02", sq * 0.4,               0.89)  // 12/2 NM-B wire LF
  add("el04", oc,                     0.93)  // duplex outlets
  // H2: NEC GFCI count — 1 per bath + 2 kitchen + 1 garage + 1 exterior + 1 laundry
  add("el05", Math.round(baths) + 5,  0.94)
  add("el06", Math.ceil(oc * 0.5),    0.92)  // switches
  add("el09", 1,                      0.99)  // 200A main panel
  add("el10", Math.ceil(oc * 0.7) + 6, 0.92) // breakers
  add("el11", Math.ceil(sq / 75),     0.91)  // recessed lights
  // H3: smoke/CO — IRC requires 1 per bedroom + 1 per floor + 1 common area
  add("el12", beds + st + 1,          0.95)

  // ── Plumbing ─────────────────────────────────────────────────────────────────
  add("pl01", baths * 45 + 30,  0.9)   // ½" PEX tubing LF
  add("pl02", baths * 25 + 20,  0.89)  // ¾" PEX main LF
  add("pl03", baths * 18 + 15,  0.88)  // 3" PVC DWV LF
  add("pl04", 30 + baths * 8,   0.87)  // 4" PVC main drain LF
  add("pl06", Math.round(baths), 0.98) // toilets
  add("pl07", Math.round(baths), 0.97) // vanities
  add("pl08", fb,               0.96)  // tubs/showers
  add("pl10", 1,                0.97)  // kitchen sink
  add("pl12", 1,                0.99)  // water heater

  // ── HVAC ─────────────────────────────────────────────────────────────────────
  add("hv01", 1,                        0.98)  // gas furnace
  add("hv02", Math.ceil(sq / 1500),     0.97)  // A/C condenser (1 per 1,500 SF)
  add("hv04", sq * 0.12,                0.88)  // flex duct (~0.12 LF/SF)
  add("hv06", sq * 0.025,               0.86)  // trunk line (~0.025 LF/SF)
  add("hv07", Math.ceil(sq / 140),      0.92)  // supply registers
  add("hv08", Math.ceil(sq / 600) + 1,  0.93)  // return grilles
  add("hv09", st,                       0.98)  // thermostats (1 per story)
  add("hv10", Math.round(baths),        0.95)  // bath exhaust fans
  add("hv11", 1,                        0.96)  // range hood

  // ── Finishes ─────────────────────────────────────────────────────────────────
  add("fn01", Math.ceil(twSF / 350), 0.91)  // interior paint (1 gal per ~350 SF)
  add("fn02", Math.ceil(twSF / 400), 0.92)  // primer
  add("fn03", per + iw,              0.93)  // baseboard trim LF
  const carpSF = beds * 180
  const tileSF = Math.round(baths) * 50 + 120
  const lvpSF  = sq - carpSF - tileSF - (bp.garageSize || 0) * 250
  if (carpSF > 0) add("fn07", carpSF,             0.89)
  if (tileSF > 0) add("fn08", tileSF,             0.9)
  if (lvpSF  > 0) add("fn06", Math.max(lvpSF, 0), 0.88)
  add("fn10", 1,  0.9)   // kitchen cabinet set
  add("fn11", 12, 0.89)  // countertop LF

  return items
}
