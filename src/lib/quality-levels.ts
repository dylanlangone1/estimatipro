export const QUALITY_LEVELS = [
  {
    key: "budget",
    label: "Budget",
    description: "Builder-grade materials, functional finishes",
    materialMultiplier: 0.70,
    laborMultiplier: 0.90,
  },
  {
    key: "standard",
    label: "Standard",
    description: "Mid-range materials, popular finishes",
    materialMultiplier: 1.00,
    laborMultiplier: 1.00,
  },
  {
    key: "premium",
    label: "Premium",
    description: "High-end materials, custom finishes",
    materialMultiplier: 1.65,
    laborMultiplier: 1.15,
  },
  {
    key: "luxury",
    label: "Luxury",
    description: "Top-tier materials, bespoke everything",
    materialMultiplier: 2.50,
    laborMultiplier: 1.35,
  },
] as const

export type QualityLevelKey = (typeof QUALITY_LEVELS)[number]["key"]

/**
 * Cost-per-SF benchmarks by project type and quality level (installed, before markup).
 * Updated to reflect real-world 2025-2026 construction costs.
 * Used by the description builder to give the AI strong pricing context.
 */
export const COST_BENCHMARKS: Record<string, Record<string, string>> = {
  kitchen_remodel: {
    budget: "$100-175/SF",
    standard: "$175-300/SF",
    premium: "$300-500/SF",
    luxury: "$500-800+/SF",
  },
  bathroom_remodel: {
    budget: "$150-250/SF",
    standard: "$250-400/SF",
    premium: "$400-650/SF",
    luxury: "$650-1000+/SF",
  },
  full_home_renovation: {
    budget: "$75-125/SF",
    standard: "$125-200/SF",
    premium: "$200-350/SF",
    luxury: "$350-600+/SF",
  },
  room_addition: {
    budget: "$175-250/SF",
    standard: "$250-375/SF",
    premium: "$375-500/SF",
    luxury: "$500-750+/SF",
  },
  basement_finish: {
    budget: "$50-75/SF",
    standard: "$75-125/SF",
    premium: "$125-200/SF",
    luxury: "$200-350+/SF",
  },
  deck_patio: {
    budget: "$30-50/SF",
    standard: "$50-80/SF",
    premium: "$80-125/SF",
    luxury: "$125-200+/SF",
  },
  new_construction: {
    budget: "$175-250/SF",
    standard: "$250-350/SF",
    premium: "$350-500/SF",
    luxury: "$500-800+/SF",
  },
  commercial_ti: {
    budget: "$60-100/SF",
    standard: "$100-175/SF",
    premium: "$175-300/SF",
    luxury: "$300-500+/SF",
  },
}
