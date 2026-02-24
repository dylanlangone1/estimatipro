// ─── Estimate Input Types ───
// Types for the three-mode estimate input system

export interface EstimatePreferences {
  lastTrades?: string[]
  lastProjectType?: string
  lastQualityLevel?: string
}

export interface AiModePayload {
  mode: "ai"
  description: string
  clientId?: string
  location?: string
}

export interface GuidedModePayload {
  mode: "guided"
  projectType: string
  trades: string[]
  sqft: string
  qualityLevel: string
  notes?: string
  clientId?: string
  location?: string
}

export interface ManualModePayload {
  mode: "manual"
  trades: string[]
  projectType: string
  scopeItems: string[]
  qualityLevel: string
  notes?: string
  clientId?: string
  location?: string
}

export type GenerateEstimatePayload =
  | AiModePayload
  | GuidedModePayload
  | ManualModePayload

export type InputMode = "ai" | "guided" | "manual"
