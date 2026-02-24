/**
 * Shared PDF Design System
 *
 * Central design tokens, utilities, and style factories used by all 4 PDF types.
 * Eliminates duplication of formatCurrency, groupByCategory, and style definitions.
 */

// ─── Design Tokens ───

export const FONT_FAMILY = "Inter"

export const fontSize = {
  xs: 7,
  sm: 8,
  base: 9,
  md: 10,
  lg: 11,
  xl: 12,
  "2xl": 14,
  "3xl": 16,
  "4xl": 18,
  "5xl": 20,
  "6xl": 24,
  "7xl": 28,
  "8xl": 32,
  "9xl": 36,
} as const

export const fontWeight = {
  normal: 400 as const,
  medium: 500 as const,
  semibold: 600 as const,
  bold: 700 as const,
}

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
}

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
} as const

export const colors = {
  // Neutrals
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  black: "#000000",

  // Brand defaults
  brandOrange: "#E94560",
  brandDark: "#1A1A2E",
  brandNavy: "#16213E",
} as const

export const borderRadius = {
  none: 0,
  sm: 2,
  base: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const

// ─── Page Settings ───

export const PAGE_MARGIN = 48
export const PAGE_MARGIN_BOTTOM = 70

// ─── Utilities ───

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export interface PDFLineItem {
  category: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  laborCost?: number | null
  materialCost?: number | null
}

export function groupByCategory(items: PDFLineItem[]): Record<string, PDFLineItem[]> {
  const groups: Record<string, PDFLineItem[]> = {}
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return groups
}

// ─── Color Helpers ───

/** Create a color with alpha (hex + 2-digit alpha suffix) */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")
  return `${hex}${a}`
}

// ─── Style Factories ───

export interface PDFColors {
  primary: string
  secondary: string
  accent: string
  text: string
  background: string
}

const defaultColors: PDFColors = {
  primary: colors.brandOrange,
  secondary: colors.brandDark,
  accent: colors.brandNavy,
  text: colors.gray800,
  background: colors.white,
}

export function getColors(overrides?: Partial<PDFColors>): PDFColors {
  return { ...defaultColors, ...overrides }
}

/** Base page styles shared across PDFs */
export function createPageStyles(c: PDFColors = defaultColors) {
  return {
    page: {
      padding: PAGE_MARGIN,
      paddingBottom: PAGE_MARGIN_BOTTOM,
      fontSize: fontSize.md,
      fontFamily: FONT_FAMILY,
      color: c.text,
      backgroundColor: c.background,
    },
    coverPage: {
      padding: 0,
      backgroundColor: c.background,
      fontFamily: FONT_FAMILY,
    },
  } as const
}

/** Table styles */
export function createTableStyles(c: PDFColors = defaultColors) {
  return {
    table: {
      width: "100%" as const,
    },
    tableHeader: {
      flexDirection: "row" as const,
      backgroundColor: colors.gray100,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.gray200,
    },
    tableHeaderText: {
      fontFamily: FONT_FAMILY,
      fontWeight: fontWeight.medium,
      fontSize: fontSize.sm,
      color: colors.gray500,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: "row" as const,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.gray200,
    },
    tableRowAlt: {
      backgroundColor: colors.gray50,
    },
    categoryRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingVertical: 7,
      paddingHorizontal: 10,
      backgroundColor: colors.gray50,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
    },
    categoryText: {
      fontFamily: FONT_FAMILY,
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.md,
      color: c.secondary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    // Column widths
    colDesc: { flex: 2 },
    colQty: { width: 40, textAlign: "right" as const },
    colUnit: { width: 35, textAlign: "center" as const },
    colUnitCost: { width: 60, textAlign: "right" as const },
    colLabor: { width: 60, textAlign: "right" as const },
    colMaterial: { width: 60, textAlign: "right" as const },
    colTotal: { width: 70, textAlign: "right" as const },
  } as const
}

/** Totals section styles */
export function createTotalsStyles(c: PDFColors = defaultColors) {
  return {
    totalsContainer: {
      marginTop: spacing[5],
      alignItems: "flex-end" as const,
    },
    totalsBox: {
      width: 240,
      padding: spacing[4],
      backgroundColor: colors.gray50,
      borderWidth: 1,
      borderColor: colors.gray200,
      borderRadius: borderRadius.md,
    },
    totalRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 3,
    },
    totalLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.md,
      color: colors.gray500,
    },
    totalValue: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
      color: c.text,
    },
    grandTotalRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: spacing[2],
      marginTop: spacing[1],
      borderTopWidth: 2,
      borderTopColor: c.primary,
    },
    grandTotalLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: c.secondary,
    },
    grandTotalValue: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: c.primary,
    },
  } as const
}

/** Terms section styles */
export function createTermsStyles(c: PDFColors = defaultColors) {
  return {
    termsSection: {
      marginBottom: spacing[5],
    },
    termsNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginRight: spacing[3],
    },
    termsNumberText: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    termsTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: c.secondary,
      marginBottom: spacing[1],
    },
    termsContent: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.base,
      lineHeight: lineHeight.relaxed,
      color: colors.gray500,
    },
    termsNotice: {
      backgroundColor: `${c.primary}08`,
      borderWidth: 1,
      borderColor: `${c.primary}20`,
      borderRadius: borderRadius.md,
      padding: spacing[3],
      marginBottom: spacing[5],
    },
    termsNoticeText: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: c.primary,
      textAlign: "center" as const,
    },
  } as const
}

/** Section heading styles */
export function createSectionStyles(c: PDFColors = defaultColors) {
  return {
    sectionTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: c.secondary,
      marginBottom: spacing[4],
      paddingBottom: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.gray200,
    },
    sectionSubtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: c.primary,
      marginBottom: spacing[2],
    },
    bodyText: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.md,
      lineHeight: lineHeight.relaxed,
      color: colors.gray700,
    },
    bodyTextSmall: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.base,
      lineHeight: lineHeight.relaxed,
      color: colors.gray500,
    },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 1.2,
    },
  } as const
}

/** Signature block styles */
export function createSignatureStyles(c: PDFColors = defaultColors) {
  return {
    sigContainer: {
      marginTop: spacing[10],
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing[10],
    },
    sigColumn: {
      flex: 1,
    },
    sigTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: c.secondary,
      marginBottom: spacing[10],
    },
    sigLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.gray700,
      marginBottom: spacing[1],
      height: 30,
    },
    sigLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.sm,
      color: colors.gray400,
    },
  } as const
}

/** Notes/Assumptions styles */
export function createNotesStyles(c: PDFColors = defaultColors) {
  return {
    notesContainer: {
      marginTop: spacing[4],
      padding: spacing[3],
      backgroundColor: colors.gray50,
      borderRadius: borderRadius.base,
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
    },
    notesTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: c.secondary,
      marginBottom: spacing[1],
    },
    noteItem: {
      fontFamily: FONT_FAMILY,
      fontSize: fontSize.base,
      color: colors.gray500,
      marginBottom: 2,
      lineHeight: lineHeight.normal,
    },
  } as const
}
