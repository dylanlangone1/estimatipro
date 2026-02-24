import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import {
  FONT_FAMILY,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  colors,
  borderRadius,
  PAGE_MARGIN,
  PAGE_MARGIN_BOTTOM,
  formatCurrency,
  groupByCategory,
  type PDFLineItem,
} from "./pdf-design-system"
import { PDFPageFooter, PDFTotalsBlock, PDFAccentBar } from "./pdf-shared-components"
import type { TemplateConfig } from "@/types/proposal"

interface BrandedEstimatePDFProps {
  title: string
  description: string
  lineItems: PDFLineItem[]
  subtotal: number
  markupPercent: number
  markupAmount: number
  taxAmount: number
  totalAmount: number
  createdAt: string
  assumptions?: string[]
  companyName?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyTagline?: string
  logoPath?: string
  templateConfig: TemplateConfig
}

export function BrandedEstimatePDF({
  title,
  description,
  lineItems,
  subtotal,
  markupPercent,
  markupAmount,
  taxAmount,
  totalAmount,
  createdAt,
  assumptions,
  companyName,
  companyPhone,
  companyEmail,
  companyAddress,
  companyTagline,
  logoPath,
  templateConfig,
}: BrandedEstimatePDFProps) {
  const { colors: tc, header, body, totals, footer } = templateConfig
  const grouped = groupByCategory(lineItems)
  const totalLabor = lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0)
  const totalMaterial = lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0)
  const hasLaborData = totalLabor > 0 || totalMaterial > 0

  // Use Inter as default instead of Helvetica
  const fontFamily = body.fontFamily === "Helvetica" ? FONT_FAMILY : (body.fontFamily || FONT_FAMILY)

  const pdfColors = {
    primary: tc.primary,
    secondary: tc.secondary,
    accent: tc.accent,
    text: tc.text,
    background: tc.background,
  }

  const s = StyleSheet.create({
    page: {
      padding: PAGE_MARGIN,
      paddingBottom: PAGE_MARGIN_BOTTOM,
      fontSize: fontSize.md,
      fontFamily,
      color: tc.text,
      backgroundColor: tc.background,
    },
    // ─── Header ───
    headerContainer: {
      marginBottom: spacing[2],
      padding: spacing[4],
      backgroundColor: header.bgColor || tc.primary,
      borderRadius: borderRadius.md,
      flexDirection: header.logoPosition === "center" ? "column" : "row",
      alignItems: header.logoPosition === "center" ? "center" : "flex-start",
      gap: spacing[3],
      borderLeftWidth: header.borderStyle === "accent" ? 5 : 0,
      borderLeftColor: tc.accent,
    },
    logo: {
      width: 56,
      height: 56,
      objectFit: "contain" as const,
    },
    companyName: {
      fontSize: fontSize["5xl"],
      fontWeight: fontWeight.bold,
      color: colors.white,
      marginBottom: 2,
    },
    tagline: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.normal,
      color: "rgba(255,255,255,0.75)",
      marginBottom: spacing[1],
    },
    contactInfo: {
      fontSize: fontSize.base,
      color: "rgba(255,255,255,0.65)",
    },
    estimateTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: "rgba(255,255,255,0.9)",
      marginTop: spacing[2],
    },
    // ─── Section ───
    section: {
      marginBottom: spacing[5],
    },
    sectionTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: tc.primary,
      marginBottom: spacing[2],
      paddingBottom: spacing[1],
      borderBottomWidth: 1,
      borderBottomColor: `${tc.primary}30`,
    },
    descriptionText: {
      fontSize: fontSize.md,
      color: tc.text,
      lineHeight: lineHeight.relaxed,
    },
    dateText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      marginBottom: spacing[4],
    },
    // ─── Table ───
    table: { width: "100%" },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: `${tc.primary}12`,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1.5,
      borderBottomColor: `${tc.primary}30`,
    },
    tableHeaderText: {
      fontWeight: fontWeight.medium,
      fontSize: fontSize.sm,
      color: tc.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.gray200,
    },
    tableRowAlt: {
      backgroundColor: body.alternateRowBg ? `${tc.secondary}06` : "transparent",
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 7,
      paddingHorizontal: 10,
      backgroundColor: body.categoryStyle === "banner" ? `${tc.primary}08` : "transparent",
      borderBottomWidth: body.categoryStyle === "underline" ? 2 : 0,
      borderBottomColor: tc.primary,
      borderLeftWidth: body.categoryStyle === "banner" ? 3 : 0,
      borderLeftColor: tc.primary,
    },
    categoryText: {
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.md,
      color: tc.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    colDesc: { flex: 2 },
    colQty: { width: 40, textAlign: "right" },
    colUnit: { width: 35, textAlign: "center" },
    colUnitCost: { width: 60, textAlign: "right" },
    colLabor: { width: 60, textAlign: "right" },
    colMaterial: { width: 60, textAlign: "right" },
    colTotal: { width: 70, textAlign: "right" },
    bold: { fontWeight: fontWeight.semibold },
    muted: { color: colors.gray500 },
    // ─── Assumptions ───
    notesContainer: {
      marginTop: spacing[4],
      padding: spacing[3],
      backgroundColor: `${tc.secondary}05`,
      borderRadius: borderRadius.base,
      borderLeftWidth: 3,
      borderLeftColor: tc.accent,
    },
    notesTitle: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: tc.secondary,
      marginBottom: spacing[1],
    },
    noteItem: {
      fontSize: fontSize.base,
      color: colors.gray500,
      marginBottom: 2,
      lineHeight: lineHeight.normal,
    },
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ─── Branded Header ─── */}
        <View style={s.headerContainer}>
          {logoPath && header.logoPosition === "left" && (
            <Image src={logoPath} style={s.logo} />
          )}
          <View style={header.logoPosition === "center" ? { alignItems: "center" } : {}}>
            {logoPath && header.logoPosition === "center" && (
              <Image src={logoPath} style={{ ...s.logo, marginBottom: spacing[2] }} />
            )}
            <Text style={s.companyName}>{companyName || "Company Name"}</Text>
            {header.showTagline && companyTagline && (
              <Text style={s.tagline}>{companyTagline}</Text>
            )}
            {companyPhone && <Text style={s.contactInfo}>{companyPhone}</Text>}
            {companyEmail && <Text style={s.contactInfo}>{companyEmail}</Text>}
            {companyAddress && <Text style={s.contactInfo}>{companyAddress}</Text>}
            <Text style={s.estimateTitle}>Estimate: {title}</Text>
          </View>
        </View>

        <PDFAccentBar color={tc.accent} height={3} marginVertical={spacing[3]} />

        {/* Date */}
        <Text style={s.dateText}>Date: {createdAt}</Text>

        {/* Description */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Project Description</Text>
          <Text style={s.descriptionText}>{description}</Text>
        </View>

        {/* ─── Line Items ─── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Estimate Breakdown</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={{ ...s.colDesc, ...s.tableHeaderText }}>Description</Text>
              <Text style={{ ...s.colQty, ...s.tableHeaderText }}>Qty</Text>
              <Text style={{ ...s.colUnit, ...s.tableHeaderText }}>Unit</Text>
              <Text style={{ ...s.colUnitCost, ...s.tableHeaderText }}>Unit Cost</Text>
              {hasLaborData && (
                <>
                  <Text style={{ ...s.colLabor, ...s.tableHeaderText }}>Labor</Text>
                  <Text style={{ ...s.colMaterial, ...s.tableHeaderText }}>Material</Text>
                </>
              )}
              <Text style={{ ...s.colTotal, ...s.tableHeaderText }}>Total</Text>
            </View>
            {Object.entries(grouped).map(([category, items]) => (
              <View key={category}>
                <View style={s.categoryRow}>
                  <Text style={s.categoryText}>{category}</Text>
                </View>
                {items.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      ...s.tableRow,
                      ...(idx % 2 === 1 ? s.tableRowAlt : {}),
                    }}
                  >
                    <Text style={s.colDesc}>{item.description}</Text>
                    <Text style={s.colQty}>{item.quantity.toLocaleString()}</Text>
                    <Text style={{ ...s.colUnit, ...s.muted }}>{item.unit}</Text>
                    <Text style={s.colUnitCost}>{formatCurrency(item.unitCost)}</Text>
                    {hasLaborData && (
                      <>
                        <Text style={{ ...s.colLabor, ...s.muted }}>
                          {item.laborCost ? formatCurrency(item.laborCost) : "\u2014"}
                        </Text>
                        <Text style={{ ...s.colMaterial, ...s.muted }}>
                          {item.materialCost ? formatCurrency(item.materialCost) : "\u2014"}
                        </Text>
                      </>
                    )}
                    <Text style={{ ...s.colTotal, ...s.bold }}>
                      {formatCurrency(item.totalCost)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* ─── Totals ─── */}
        <PDFTotalsBlock
          subtotal={subtotal}
          taxAmount={taxAmount}
          markupPercent={markupPercent}
          markupAmount={markupAmount}
          totalAmount={totalAmount}
          c={pdfColors}
          laborTotal={hasLaborData ? totalLabor : undefined}
          materialTotal={hasLaborData ? totalMaterial : undefined}
        />

        {/* ─── Assumptions ─── */}
        {assumptions && assumptions.length > 0 && (
          <View style={s.notesContainer}>
            <Text style={s.notesTitle}>Assumptions</Text>
            {assumptions.map((a, i) => (
              <Text key={i} style={s.noteItem}>
                {"\u2022"} {a}
              </Text>
            ))}
          </View>
        )}

        {/* ─── Footer ─── */}
        <PDFPageFooter
          companyName={companyName}
          showBranding={footer.showGeneratedBy}
        />
      </Page>
    </Document>
  )
}
