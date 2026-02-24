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
 * Used by the description builder to give the AI strong pricing context.
 */
export const COST_BENCHMARKS: Record<string, Record<string, string>> = {
  kitchen_remodel: {
    budget: "$75-125/SF",
    standard: "$125-200/SF",
    premium: "$200-350/SF",
    luxury: "$350-600+/SF",
  },
  bathroom_remodel: {
    budget: "$100-175/SF",
    standard: "$175-300/SF",
    premium: "$300-500/SF",
    luxury: "$500-800+/SF",
  },
  full_home_renovation: {
    budget: "$50-80/SF",
    standard: "$80-150/SF",
    premium: "$150-250/SF",
    luxury: "$250-500+/SF",
  },
  room_addition: {
    budget: "$100-175/SF",
    standard: "$175-275/SF",
    premium: "$275-400/SF",
    luxury: "$400-600+/SF",
  },
  basement_finish: {
    budget: "$30-50/SF",
    standard: "$50-85/SF",
    premium: "$85-150/SF",
    luxury: "$150-250+/SF",
  },
  deck_patio: {
    budget: "$20-35/SF",
    standard: "$35-55/SF",
    premium: "$55-85/SF",
    luxury: "$85-150+/SF",
  },
  new_construction: {
    budget: "$125-175/SF",
    standard: "$175-275/SF",
    premium: "$275-400/SF",
    luxury: "$400-700+/SF",
  },
  commercial_ti: {
    budget: "$40-70/SF",
    standard: "$70-130/SF",
    premium: "$130-225/SF",
    luxury: "$225-400+/SF",
  },
}
