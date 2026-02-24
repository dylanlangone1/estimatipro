export interface Trade {
  key: string
  label: string
  icon: string
  categories: string[]
}

export const TRADES: Record<string, Trade> = {
  general_contractor: {
    key: "general_contractor",
    label: "General Contractor",
    icon: "🏗️",
    categories: [
      "Demolition", "Framing", "Drywall", "Insulation", "Painting",
      "Flooring", "Trim/Finish", "Cleanup", "Permits", "Project Management",
    ],
  },
  plumbing: {
    key: "plumbing",
    label: "Plumbing",
    icon: "🔧",
    categories: [
      "Rough-In", "Fixtures", "Water Heaters", "Drain/Sewer",
      "Gas Lines", "Water Lines", "Permits", "Service/Repair",
    ],
  },
  electrical: {
    key: "electrical",
    label: "Electrical",
    icon: "⚡",
    categories: [
      "Rough-In", "Panel/Service", "Fixtures/Lighting", "Outlets/Switches",
      "Low Voltage", "EV Charging", "Permits", "Service/Repair",
    ],
  },
  hvac: {
    key: "hvac",
    label: "HVAC",
    icon: "❄️",
    categories: [
      "Equipment", "Ductwork", "Refrigerant Lines", "Controls/Thermostats",
      "Ventilation", "Mini-Splits", "Permits", "Service/Repair",
    ],
  },
  roofing: {
    key: "roofing",
    label: "Roofing",
    icon: "🏠",
    categories: [
      "Tear-Off", "Decking", "Underlayment", "Shingles/Materials",
      "Flashing", "Gutters", "Ventilation", "Cleanup",
    ],
  },
  painting: {
    key: "painting",
    label: "Painting",
    icon: "🎨",
    categories: [
      "Surface Prep", "Primer", "Interior Paint", "Exterior Paint",
      "Staining", "Caulking", "Trim/Detail", "Cleanup",
    ],
  },
  carpentry: {
    key: "carpentry",
    label: "Carpentry",
    icon: "🪚",
    categories: [
      "Framing", "Trim/Molding", "Cabinetry", "Doors/Windows",
      "Decks/Porches", "Custom Millwork", "Structural", "Finish Work",
    ],
  },
  concrete: {
    key: "concrete",
    label: "Concrete/Masonry",
    icon: "🧱",
    categories: [
      "Excavation", "Forming", "Rebar/Mesh", "Pouring",
      "Finishing", "Flatwork", "Block/Brick", "Stamped/Decorative",
    ],
  },
  landscaping: {
    key: "landscaping",
    label: "Landscaping",
    icon: "🌿",
    categories: [
      "Grading", "Planting", "Irrigation", "Hardscaping",
      "Fencing", "Retaining Walls", "Lighting", "Maintenance",
    ],
  },
  remodeling: {
    key: "remodeling",
    label: "Remodeling",
    icon: "🔨",
    categories: [
      "Demolition", "Kitchen", "Bathroom", "Basement",
      "Additions", "Flooring", "Cabinetry", "Countertops",
    ],
  },
  flooring: {
    key: "flooring",
    label: "Flooring",
    icon: "🪵",
    categories: [
      "Removal", "Subfloor Prep", "Hardwood", "Tile",
      "LVP/LVT", "Carpet", "Transitions", "Trim/Baseboards",
    ],
  },
  commercial: {
    key: "commercial",
    label: "Commercial",
    icon: "🏢",
    categories: [
      "Tenant Build-Out", "Demolition", "Framing", "MEP Coordination",
      "Ceiling Grid", "Fire Protection", "ADA Compliance", "Permits",
    ],
  },
  windows_doors: {
    key: "windows_doors",
    label: "Windows & Doors",
    icon: "🪟",
    categories: [
      "Removal", "Window Install", "Door Install", "Trim/Casing",
      "Flashing/Waterproofing", "Hardware", "Custom/Specialty",
    ],
  },
  siding: {
    key: "siding",
    label: "Siding/Exterior",
    icon: "🏡",
    categories: [
      "Removal", "Housewrap", "Vinyl Siding", "Fiber Cement",
      "Wood Siding", "Stone Veneer", "Trim", "Soffit/Fascia",
    ],
  },
  new_home_builder: {
    key: "new_home_builder",
    label: "New Home Builder",
    icon: "🏠",
    categories: [
      "Site Work/Excavation", "Foundation/Footings", "Framing", "Roofing",
      "Windows & Doors", "Exterior/Siding", "Plumbing Rough-In", "Electrical Rough-In",
      "HVAC", "Insulation", "Drywall", "Interior Trim/Finish",
      "Flooring", "Cabinetry/Countertops", "Painting", "Fixtures/Appliances",
      "Landscaping/Grading", "Driveway/Flatwork", "Permits/Inspections", "Cleanup",
    ],
  },
  other: {
    key: "other",
    label: "Other",
    icon: "🛠️",
    categories: [
      "Labor", "Materials", "Equipment", "Permits",
      "Subcontractor", "Overhead", "Misc",
    ],
  },
}

export const TRADE_LIST = Object.values(TRADES)

export function getTradeByKey(key: string): Trade | undefined {
  return TRADES[key]
}

export function getTradeCategoriesForTrades(tradeKeys: string[]): string[] {
  const categories = new Set<string>()
  for (const key of tradeKeys) {
    const trade = TRADES[key]
    if (trade) {
      trade.categories.forEach((c) => categories.add(c))
    }
  }
  return Array.from(categories)
}
