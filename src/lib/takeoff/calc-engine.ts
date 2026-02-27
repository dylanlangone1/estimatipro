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
    items.push({
      ...m,
      lid: ++lid,
      rawQty: raw,
      quantity: qty,
      totalCost: +(qty * m.cost).toFixed(2),
      confidence: confidence ?? 0.9 + Math.random() * 0.08,
    })
  }

  const sq = bp.sqft ?? 2000
  const st = bp.stories ?? 1
  const fp = sq / st
  const per = Math.sqrt(fp) * 4
  const iw = sq * 0.35
  const ch = 9
  const ewSF = per * ch * st
  const iwSF = iw * ch
  const twSF = ewSF + iwSF
  const rSF = fp * (bp.roofType === "hip" ? 1.25 : bp.roofType === "gable" ? 1.18 : 1.05)
  const rSQ = rSF / 100
  const baths = bp.bathrooms ?? 2
  const beds = bp.bedrooms ?? 3
  const fb = Math.floor(baths)

  // Foundation
  add("f02", fp, 0.96)
  add("f05", fp, 0.95)
  add("f04", fp, 0.94)
  add("f03", fp * 0.5, 0.93)
  add("f08", fp, 0.93)
  add("f06", Math.ceil(per / 4), 0.95)
  add("f07", per, 0.92)

  // Framing
  const es = (per * 12) / 16 * st
  const is2 = (iw * 12) / 16
  add("r01", es + is2, 0.94)
  add("r03", (per + iw) * 3, 0.95)
  const to = 2 + 8 + Math.ceil(sq / 170)
  add("r05", to * 5, 0.93)
  add("r06", per * 0.3, 0.91)
  add("r07", ewSF + rSF, 0.95)
  add("r08", Math.ceil(Math.sqrt(fp) / 2), 0.91)
  add("r09", Math.ceil(fp / 1.33), 0.94)
  add("r10", Math.sqrt(fp) * 0.4, 0.9)
  add("r11", Math.ceil(fp / 1.33), 0.93)
  add("r13", Math.ceil(sq / 400), 0.91)

  // Exterior
  add("e01", ewSF * 0.85, 0.93)
  add("e02", ewSF, 0.96)
  add("e03", per, 0.94)
  add("e04", per, 0.95)

  // Roofing
  add("rf01", rSQ, 0.94)
  add("rf02", rSQ, 0.95)
  add("rf03", per * 1.1, 0.96)
  add("rf04", Math.sqrt(fp), 0.94)
  add("rf05", per * 3, 0.93)

  // Drywall
  add("i01", Math.ceil(twSF / 48), 0.95)
  add("i02", Math.ceil(fp / 48), 0.94)
  add("i03", Math.ceil(twSF / 400), 0.92)
  add("i04", Math.ceil(twSF / 500), 0.93)
  add("i05", Math.ceil(twSF / 300), 0.91)

  // Insulation
  add("n01", fp, 0.94)
  add("n03", ewSF, 0.95)

  // Doors & Windows
  add("dw01", 2, 0.97)
  add("dw04", beds + baths + 3, 0.95)
  add("dw05", beds + 1, 0.94)
  add("dw06", Math.ceil(sq / 170), 0.94)
  if (bp.garageSize >= 2) add("dw10", 1, 0.98)

  // Electrical
  const oc = Math.ceil(sq / 55)
  add("el01", sq * 1.2, 0.9)
  add("el02", sq * 0.4, 0.89)
  add("el04", oc, 0.93)
  add("el05", baths + 3, 0.94)
  add("el06", Math.ceil(oc * 0.5), 0.92)
  add("el09", 1, 0.99)
  add("el10", Math.ceil(oc * 0.7) + 6, 0.92)
  add("el11", Math.ceil(sq / 75), 0.91)
  add("el12", beds + 2, 0.95)

  // Plumbing
  add("pl01", baths * 45 + 30, 0.9)
  add("pl02", baths * 25 + 20, 0.89)
  add("pl03", baths * 18 + 15, 0.88)
  add("pl04", 30 + baths * 8, 0.87)
  add("pl06", Math.round(baths), 0.98)
  add("pl07", Math.round(baths), 0.97)
  add("pl08", fb, 0.96)
  add("pl10", 1, 0.97)
  add("pl12", 1, 0.99)

  // HVAC
  add("hv01", 1, 0.98)
  add("hv02", Math.ceil(sq / 1500), 0.97)
  add("hv04", sq * 0.3, 0.88)
  add("hv06", sq * 0.06, 0.86)
  add("hv07", Math.ceil(sq / 140), 0.92)
  add("hv08", Math.ceil(sq / 600) + 1, 0.93)
  add("hv09", st, 0.98)
  add("hv10", Math.round(baths), 0.95)
  add("hv11", 1, 0.96)

  // Finishes
  add("fn01", Math.ceil(twSF / 350), 0.91)
  add("fn02", Math.ceil(twSF / 400), 0.92)
  add("fn03", per + iw, 0.93)
  const carpSF = beds * 180
  const tileSF = Math.round(baths) * 50 + 120
  const lvpSF = sq - carpSF - tileSF - (bp.garageSize || 0) * 250
  if (carpSF > 0) add("fn07", carpSF, 0.89)
  if (tileSF > 0) add("fn08", tileSF, 0.9)
  if (lvpSF > 0) add("fn06", Math.max(lvpSF, 0), 0.88)
  add("fn10", 1, 0.9)
  add("fn11", 12, 0.89)

  return items
}
