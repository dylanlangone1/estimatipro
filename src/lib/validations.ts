import { z } from "zod/v4"

export const lineItemSchema = z.object({
  category: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitCost: z.number(),
  totalCost: z.number(),
  laborCost: z.number().default(0),
  materialCost: z.number().default(0),
  markupPercent: z.number().optional(),
})

// Resilient severity normalizer — maps any AI-returned severity string to one of
// the three valid values. Claude sometimes returns "error", "high", "medium", etc.
// which broke the old z.enum(). Using z.string() + transform prevents that crash.
const normalizeSeverity = z
  .string()
  .optional()
  .transform((v): "info" | "warning" | "critical" => {
    const s = (v ?? "").toLowerCase()
    if (s === "critical" || s === "error" || s === "severe" || s === "fatal") return "critical"
    if (s === "warning" || s === "high" || s === "medium" || s === "warn") return "warning"
    return "info"
  })

export const deviationAlertSchema = z.union([
  z.object({
    lineItem: z.string().optional().default(""),
    alert: z.string(),
    severity: normalizeSeverity,
  }),
  z.string().transform((s) => ({
    lineItem: "",
    alert: s,
    severity: "info" as const,
  })),
])

export const estimateResponseSchema = z.object({
  title: z.string(),
  projectType: z.string().optional().default("residential"),
  assumptions: z.array(z.string()).catch([]).optional().default([]),
  lineItems: z.array(lineItemSchema).min(1),
  subtotal: z.number(),
  suggestedMarkupPercent: z.number().optional().default(20),
  suggestedMarkupAmount: z.number().optional().default(0),
  suggestedTax: z.number().optional().default(0),
  totalAmount: z.number(),
  estimatedDuration: z.string().optional().default("TBD"),
  notes: z.array(z.string()).catch([]).optional().default([]),
  deviationAlerts: z.array(deviationAlertSchema).catch([]).optional().default([]),
})

export const editResponseSchema = z.object({
  updatedEstimate: estimateResponseSchema,
  changes: z
    .array(
      z.object({
        type: z.enum(["modified", "added", "removed"]),
        description: z.string(),
        lineItem: z.string().optional(),
      })
    )
    .catch([])
    .optional()
    .default([]),
})

// ─── Estimate Generation Input (three modes) ───

const aiModeSchema = z.object({
  mode: z.literal("ai"),
  description: z.string().min(10, "Please describe the project in at least 10 characters"),
  projectType: z.string().optional(),
  clientId: z.string().optional(),
  location: z.string().optional(),
})

const guidedModeSchema = z.object({
  mode: z.literal("guided"),
  projectType: z.string().min(1),
  trades: z.array(z.string()).min(1),
  sqft: z.string().min(1),
  qualityLevel: z.enum(["budget", "standard", "premium", "luxury"]),
  notes: z.string().optional(),
  clientId: z.string().optional(),
  location: z.string().optional(),
})

const manualModeSchema = z.object({
  mode: z.literal("manual"),
  trades: z.array(z.string()).min(1),
  projectType: z.string().min(1),
  scopeItems: z.array(z.string()).min(1),
  qualityLevel: z.enum(["budget", "standard", "premium", "luxury"]),
  notes: z.string().optional(),
  clientId: z.string().optional(),
  location: z.string().optional(),
})

export const generateEstimateInputSchema = z.discriminatedUnion("mode", [
  aiModeSchema,
  guidedModeSchema,
  manualModeSchema,
])

export const editEstimateInputSchema = z.object({
  estimateId: z.string(),
  prompt: z.string().min(3, "Please describe what you want to change"),
})

// ─── Document Classification ───

export const documentClassificationSchema = z.object({
  documentType: z.enum([
    "estimate",
    "supplier_invoice",
    "client_invoice",
    "plan",
    "photo",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  reasoning: z.string().optional().default(""),
})

// ─── Supplier Invoice Parsing ───

export const supplierItemSchema = z.object({
  itemDescription: z.string(),
  category: z.string().optional().default("Other"),
  sku: z.string().optional().default(""),
  quantity: z.number().optional().default(1),
  unit: z.string().optional().default("ea"),
  unitPrice: z.number(),
  totalPrice: z.number(),
  normalizedName: z.string().optional(),
  normalizedUnit: z.string().optional(),
  normalizedUnitPrice: z.number().optional(),
  brandName: z.string().optional(),
  productLine: z.string().optional(),
})

export const supplierInvoiceResponseSchema = z.object({
  supplierName: z.string().optional().default("Unknown Supplier"),
  invoiceDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  items: z.array(supplierItemSchema).min(1),
  subtotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
})

// ─── Training System ───

export const createTrainingRuleSchema = z.object({
  content: z.string().min(5, "Rule must be at least 5 characters"),
  category: z.enum(["pricing", "materials", "labor", "general"]),
  priority: z.enum(["CRITICAL", "IMPORTANT", "PREFERENCE"]),
})

export const updateTrainingRuleSchema = z.object({
  id: z.string(),
  content: z.string().min(5).optional(),
  category: z.enum(["pricing", "materials", "labor", "general"]).optional(),
  priority: z.enum(["CRITICAL", "IMPORTANT", "PREFERENCE"]).optional(),
  isActive: z.boolean().optional(),
})

export const quickTeachSchema = z.object({
  content: z.string().min(5, "Rule must be at least 5 characters"),
  category: z.enum(["pricing", "materials", "labor", "general"]),
  priority: z.enum(["CRITICAL", "IMPORTANT", "PREFERENCE"]),
  estimateId: z.string().optional(),
})

export const correctionAnalysisSchema = z.object({
  extractedRule: z.string(),
  category: z.enum(["pricing", "materials", "labor", "general"]),
  context: z.string(),
  confidence: z.number().min(0).max(1),
})
