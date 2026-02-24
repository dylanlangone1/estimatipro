export interface LineItemData {
  category: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  laborCost?: number
  materialCost?: number
  markupPercent?: number
}

export interface AIEstimateResponse {
  title: string
  projectType: string
  assumptions: string[]
  lineItems: LineItemData[]
  subtotal: number
  suggestedMarkupPercent: number
  suggestedMarkupAmount: number
  suggestedTax: number
  totalAmount: number
  estimatedDuration: string
  notes: string[]
  deviationAlerts: DeviationAlert[]
}

export interface DeviationAlert {
  lineItem: string
  alert: string
  severity: "info" | "warning" | "critical"
}

export interface EditResponse {
  updatedEstimate: AIEstimateResponse
  changes: EditChange[]
}

export interface EditChange {
  type: "modified" | "added" | "removed"
  description: string
  lineItem?: string
}
