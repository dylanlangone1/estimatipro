import type { Material } from "@/types/takeoff"

type MaterialDB = Record<string, Material[]>

export const MATERIAL_DB: MaterialDB = {
  foundation: [
    { id: "f02", name: 'Concrete Slab (4")', unit: "SF", cost: 6.5, cat: "Foundation", waste: 1.03 },
    { id: "f03", name: "#4 Rebar", unit: "LF", cost: 1.15, cat: "Foundation", waste: 1.1 },
    { id: "f04", name: "Vapor Barrier 6mil", unit: "SF", cost: 0.12, cat: "Foundation", waste: 1.08 },
    { id: "f05", name: 'Gravel Base 4"', unit: "SF", cost: 1.25, cat: "Foundation", waste: 1.05 },
    { id: "f06", name: "Anchor Bolts", unit: "EA", cost: 2.85, cat: "Foundation", waste: 1.0 },
    { id: "f07", name: "Form Boards", unit: "LF", cost: 1.8, cat: "Foundation", waste: 1.08 },
    { id: "f08", name: "Wire Mesh 6x6", unit: "SF", cost: 0.32, cat: "Foundation", waste: 1.1 },
  ],
  framing: [
    { id: "r01", name: "2x4 Studs Pre-cut", unit: "EA", cost: 4.28, cat: "Framing", waste: 1.08 },
    { id: "r02", name: "2x6 Studs Pre-cut", unit: "EA", cost: 6.85, cat: "Framing", waste: 1.08 },
    { id: "r03", name: "2x4 Plates 16'", unit: "LF", cost: 0.55, cat: "Framing", waste: 1.05 },
    { id: "r04", name: "2x6 Plates 16'", unit: "LF", cost: 0.82, cat: "Framing", waste: 1.05 },
    { id: "r05", name: "2x10 Headers", unit: "LF", cost: 2.1, cat: "Framing", waste: 1.1 },
    { id: "r06", name: "2x12 Ridge", unit: "LF", cost: 2.95, cat: "Framing", waste: 1.1 },
    { id: "r07", name: 'OSB Sheathing 7/16"', unit: "SF", cost: 0.85, cat: "Framing", waste: 1.08 },
    { id: "r08", name: "Roof Trusses", unit: "EA", cost: 165, cat: "Framing", waste: 1.0 },
    { id: "r09", name: "2x10 Floor Joists", unit: "EA", cost: 18.5, cat: "Framing", waste: 1.05 },
    { id: "r10", name: "LVL Beam", unit: "LF", cost: 12.5, cat: "Framing", waste: 1.05 },
    { id: "r11", name: "Joist Hangers", unit: "EA", cost: 2.75, cat: "Framing", waste: 1.0 },
    { id: "r13", name: "16d Nails (50lb box)", unit: "BX", cost: 65, cat: "Framing", waste: 1.0 },
  ],
  exterior: [
    { id: "e01", name: "Vinyl Siding D4.5", unit: "SF", cost: 3.75, cat: "Exterior", waste: 1.1 },
    { id: "e02", name: "House Wrap (Tyvek)", unit: "SF", cost: 0.18, cat: "Exterior", waste: 1.08 },
    { id: "e03", name: "Vented Soffit", unit: "LF", cost: 5.2, cat: "Exterior", waste: 1.05 },
    { id: "e04", name: "Aluminum Fascia", unit: "LF", cost: 3.8, cat: "Exterior", waste: 1.05 },
  ],
  roofing: [
    { id: "rf01", name: "Arch. Shingles 30yr", unit: "SQ", cost: 115, cat: "Roofing", waste: 1.12 },
    { id: "rf02", name: "Synthetic Underlayment", unit: "SQ", cost: 28, cat: "Roofing", waste: 1.1 },
    { id: "rf03", name: "Drip Edge", unit: "LF", cost: 1.45, cat: "Roofing", waste: 1.05 },
    { id: "rf04", name: "Ridge Vent", unit: "LF", cost: 3.5, cat: "Roofing", waste: 1.05 },
    { id: "rf05", name: "Ice & Water Shield", unit: "SF", cost: 0.95, cat: "Roofing", waste: 1.05 },
  ],
  drywall: [
    { id: "i01", name: '1/2" Drywall 4x12', unit: "SH", cost: 16.5, cat: "Drywall", waste: 1.1 },
    { id: "i02", name: '5/8" Drywall Ceiling', unit: "SH", cost: 19.5, cat: "Drywall", waste: 1.1 },
    { id: "i03", name: "Joint Compound 5gal", unit: "EA", cost: 14.5, cat: "Drywall", waste: 1.0 },
    { id: "i04", name: "Paper Tape", unit: "RL", cost: 5.75, cat: "Drywall", waste: 1.0 },
    { id: "i05", name: "Drywall Screws 25lb", unit: "BX", cost: 42, cat: "Drywall", waste: 1.0 },
  ],
  insulation: [
    { id: "n01", name: "R-38 Batt (attic)", unit: "SF", cost: 1.15, cat: "Insulation", waste: 1.05 },
    { id: "n03", name: "R-13 Batt (walls)", unit: "SF", cost: 0.55, cat: "Insulation", waste: 1.05 },
    { id: "n04", name: "R-21 Batt (ext. walls)", unit: "SF", cost: 0.78, cat: "Insulation", waste: 1.05 },
  ],
  doors_windows: [
    { id: "dw01", name: 'Ext Steel Door 36"', unit: "EA", cost: 385, cat: "Doors/Windows", waste: 1.0 },
    { id: "dw04", name: "Int Door Prehung", unit: "EA", cost: 145, cat: "Doors/Windows", waste: 1.0 },
    { id: "dw05", name: "Bi-fold Closet Door", unit: "EA", cost: 95, cat: "Doors/Windows", waste: 1.0 },
    { id: "dw06", name: "Double-Hung Window", unit: "EA", cost: 285, cat: "Doors/Windows", waste: 1.0 },
    { id: "dw10", name: "Garage Door 16x7", unit: "EA", cost: 1250, cat: "Doors/Windows", waste: 1.0 },
  ],
  electrical: [
    { id: "el01", name: "14/2 NM-B Wire", unit: "LF", cost: 0.65, cat: "Electrical", waste: 1.15 },
    { id: "el02", name: "12/2 NM-B Wire", unit: "LF", cost: 0.85, cat: "Electrical", waste: 1.15 },
    { id: "el04", name: "Duplex Outlet", unit: "EA", cost: 3.5, cat: "Electrical", waste: 1.0 },
    { id: "el05", name: "GFCI Outlet", unit: "EA", cost: 18.5, cat: "Electrical", waste: 1.0 },
    { id: "el06", name: "Switch", unit: "EA", cost: 3.25, cat: "Electrical", waste: 1.0 },
    { id: "el09", name: "200A Main Panel", unit: "EA", cost: 485, cat: "Electrical", waste: 1.0 },
    { id: "el10", name: "20A Breaker", unit: "EA", cost: 8.5, cat: "Electrical", waste: 1.0 },
    { id: "el11", name: 'Recessed Light 6"', unit: "EA", cost: 28, cat: "Electrical", waste: 1.0 },
    { id: "el12", name: "Smoke/CO Detector", unit: "EA", cost: 35, cat: "Electrical", waste: 1.0 },
  ],
  plumbing: [
    { id: "pl01", name: '1/2" PEX Tubing', unit: "LF", cost: 0.85, cat: "Plumbing", waste: 1.12 },
    { id: "pl02", name: '3/4" PEX Main', unit: "LF", cost: 1.25, cat: "Plumbing", waste: 1.12 },
    { id: "pl03", name: '3" PVC DWV', unit: "LF", cost: 3.45, cat: "Plumbing", waste: 1.1 },
    { id: "pl04", name: '4" PVC Main Drain', unit: "LF", cost: 4.8, cat: "Plumbing", waste: 1.1 },
    { id: "pl06", name: "Toilet", unit: "EA", cost: 225, cat: "Plumbing", waste: 1.0 },
    { id: "pl07", name: "Vanity w/ Sink", unit: "EA", cost: 385, cat: "Plumbing", waste: 1.0 },
    { id: "pl08", name: "Bathtub/Shower", unit: "EA", cost: 650, cat: "Plumbing", waste: 1.0 },
    { id: "pl10", name: "Kitchen Sink SS", unit: "EA", cost: 285, cat: "Plumbing", waste: 1.0 },
    { id: "pl12", name: "Water Heater 50gal", unit: "EA", cost: 850, cat: "Plumbing", waste: 1.0 },
  ],
  hvac: [
    { id: "hv01", name: "Gas Furnace 80k BTU", unit: "EA", cost: 2200, cat: "HVAC", waste: 1.0 },
    { id: "hv02", name: "A/C Condenser 3-ton", unit: "EA", cost: 2800, cat: "HVAC", waste: 1.0 },
    { id: "hv04", name: '6" Flex Duct', unit: "LF", cost: 2.15, cat: "HVAC", waste: 1.1 },
    { id: "hv06", name: "Trunk Line", unit: "LF", cost: 8.5, cat: "HVAC", waste: 1.08 },
    { id: "hv07", name: "Supply Register", unit: "EA", cost: 12.5, cat: "HVAC", waste: 1.0 },
    { id: "hv08", name: "Return Grille", unit: "EA", cost: 22, cat: "HVAC", waste: 1.0 },
    { id: "hv09", name: "Thermostat", unit: "EA", cost: 85, cat: "HVAC", waste: 1.0 },
    { id: "hv10", name: "Bath Exhaust Fan", unit: "EA", cost: 65, cat: "HVAC", waste: 1.0 },
    { id: "hv11", name: "Range Hood", unit: "EA", cost: 185, cat: "HVAC", waste: 1.0 },
  ],
  finishes: [
    { id: "fn01", name: "Interior Paint (gal)", unit: "GAL", cost: 38, cat: "Finishes", waste: 1.0 },
    { id: "fn02", name: "Primer (gal)", unit: "GAL", cost: 28, cat: "Finishes", waste: 1.0 },
    { id: "fn03", name: "Baseboard Trim", unit: "LF", cost: 1.85, cat: "Finishes", waste: 1.08 },
    { id: "fn06", name: "LVP Flooring", unit: "SF", cost: 3.25, cat: "Finishes", waste: 1.1 },
    { id: "fn07", name: "Carpet w/ Pad", unit: "SF", cost: 4.5, cat: "Finishes", waste: 1.08 },
    { id: "fn08", name: "Ceramic Tile", unit: "SF", cost: 5.8, cat: "Finishes", waste: 1.12 },
    { id: "fn10", name: "Kitchen Cabinets", unit: "SET", cost: 3200, cat: "Finishes", waste: 1.0 },
    { id: "fn11", name: "Countertop", unit: "LF", cost: 45, cat: "Finishes", waste: 1.05 },
  ],
}

export function getMaterial(id: string): Material | null {
  for (const category of Object.values(MATERIAL_DB)) {
    const found = category.find((m) => m.id === id)
    if (found) return found
  }
  return null
}
