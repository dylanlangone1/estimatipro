export interface Material {
  id: string
  name: string
  unit: string
  cost: number
  cat: string
  waste: number
}

export interface TakeoffItem extends Material {
  lid: number
  rawQty: number
  quantity: number
  totalCost: number
  confidence: number
}

export interface BlueprintParams {
  sqft: number
  stories: number
  bedrooms: number
  bathrooms: number
  garageSize: number
  roofType: "gable" | "hip" | "flat"
  foundationType: "slab" | "crawl" | "basement"
  projectName?: string
  zipCode?: string
}

export interface AuditLayer {
  name: string
  status: "pass" | "warn" | "fail"
  detail: string
}

export interface AuditFlag {
  level: "pass" | "warn" | "error" | "info"
  layer: number
  message: string
}

export interface AuditResult {
  flags: AuditFlag[]
  layers: AuditLayer[]
  score: number
  grade: "A" | "B" | "C" | "D"
  itemFlags: Record<number, "warn" | "error">
  errors: number
  warnings: number
}

export interface BlueprintAnalysis {
  totalSqft?: number
  stories?: number
  bedrooms?: number
  bathrooms?: number
  garageSize?: number
  roofType?: string
  foundationType?: string
  exteriorWallLF?: number
  interiorWallLF?: number
  windows?: { doubleHung?: number; sliding?: number; picture?: number }
  doors?: { exterior?: number; interior?: number }
  kitchenLF?: number
  ceilingHeight?: number
  notes?: string
}
