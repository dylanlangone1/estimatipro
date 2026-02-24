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

export const deviationAlertSchema = z.union([
  z.object({
    lineItem: z.string().optional().default(""),
    alert: z.string(),
    severity: z.enum(["info", "warning", "critical"]).optional().default("info"),
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
  assumptions: z.array(z.string()).optional().default([]),
  lineItems: z.array(lineItemSchema).min(1),
  subtotal: z.number(),
  suggestedMarkupPercent: z.number().optional().default(20),
  suggestedMarkupAmount: z.number().optional().default(0),
  suggestedTax: z.number().optional().default(0),
  totalAmount: z.number(),
  estimatedDuration: z.string().optional().default("TBD"),
  notes: z.array(z.string()).optional().default([]),
  deviationAlerts: z.array(deviationAlertSchema).optional().default([]),
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
    .optional()
    .default([]),
})

// ─── Estimate Generation Input (three modes) ───

const aiModeSchema = z.object({
  mode: z.literal("ai"),
  description: z.string().min(10, "Please describe the project in at least 10 characters"),
  projectType: z.string().optional(),
  clientId: z.string().optional(),
})

const guidedModeSchema = z.object({
  mode: z.literal("guided"),
  projectType: z.string().min(1),
  trades: z.array(z.string()).min(1),
  sqft: z.string().min(1),
  qualityLevel: z.enum(["budget", "standard", "premium", "luxury"]),
  notes: z.string().optional(),
  clientId: z.string().optional(),
})

const manualModeSchema = z.object({
  mode: z.literal("manual"),
  trades: z.array(z.string()).min(1),
  projectType: z.string().min(1),
  scopeItems: z.array(z.string()).min(1),
  qualityLevel: z.enum(["budget", "standard", "premium", "luxury"]),
  notes: z.string().optional(),
  clientId: z.string().optional(),
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
