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

interface EstimatePDFProps {
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
  logoPath?: string
}

const s = StyleSheet.create({
  page: {
    padding: PAGE_MARGIN,
    paddingBottom: PAGE_MARGIN_BOTTOM,
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    color: colors.gray800,
    backgroundColor: colors.white,
  },
  // ─── Header ───
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[2],
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: fontSize["4xl"],
    fontWeight: fontWeight.bold,
    color: colors.brandDark,
    marginBottom: 2,
  },
  headerLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.brandOrange,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing[1],
  },
  headerTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.semibold,
    color: colors.gray700,
  },
  headerDate: {
    fontSize: fontSize.base,
    color: colors.gray400,
    marginTop: 2,
  },
  contactLine: {
    fontSize: fontSize.base,
    color: colors.gray500,
    marginTop: 1,
  },
  logo: {
    width: 40,
    height: 40,
    objectFit: "contain" as const,
    marginBottom: spacing[2],
  },
  // ─── Section ───
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.brandDark,
    marginBottom: spacing[2],
    paddingBottom: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.gray700,
    lineHeight: lineHeight.relaxed,
  },
  // ─── Table ───
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.gray100,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.gray200,
  },
  tableHeaderText: {
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    color: colors.gray500,
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
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: colors.gray50,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandOrange,
  },
  categoryText: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
    color: colors.brandDark,
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
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandNavy,
  },
  notesTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.brandDark,
    marginBottom: spacing[1],
  },
  noteItem: {
    fontSize: fontSize.base,
    color: colors.gray500,
    marginBottom: 2,
    lineHeight: lineHeight.normal,
  },
})

export function EstimatePDF({
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
  logoPath,
}: EstimatePDFProps) {
  const grouped = groupByCategory(lineItems)
  const totalLabor = lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0)
  const totalMaterial = lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0)
  const hasLaborData = totalLabor > 0 || totalMaterial > 0

  const pdfColors = {
    primary: colors.brandOrange,
    secondary: colors.brandDark,
    accent: colors.brandNavy,
    text: colors.gray800,
    background: colors.white,
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ─── Header ─── */}
        <View style={s.headerContainer}>
          <View style={s.headerLeft}>
            {logoPath && <Image src={logoPath} style={s.logo} />}
            {companyName ? (
              <>
                <Text style={s.companyName}>{companyName}</Text>
                {companyPhone && <Text style={s.contactLine}>{companyPhone}</Text>}
                {companyEmail && <Text style={s.contactLine}>{companyEmail}</Text>}
                {companyAddress && <Text style={s.contactLine}>{companyAddress}</Text>}
              </>
            ) : (
              <Text style={s.companyName}>{title}</Text>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>Internal Estimate</Text>
            {companyName && <Text style={s.headerTitle}>{title}</Text>}
            <Text style={s.headerDate}>{createdAt}</Text>
          </View>
        </View>

        <PDFAccentBar color={colors.brandOrange} height={3} marginVertical={spacing[4]} />

        {/* ─── Description ─── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Project Description</Text>
          <Text style={s.descriptionText}>{description}</Text>
        </View>

        {/* ─── Line Items Table ─── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Estimate Breakdown</Text>
          <View style={s.table}>
            {/* Table Header */}
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

            {/* Categories + Items */}
            {Object.entries(grouped).map(([category, items]) => (
              <View key={category}>
                <View style={s.categoryRow}>
                  <Text style={s.categoryText}>{category}</Text>
                </View>
                {items.map((item, idx) => (
                  <View key={idx} style={s.tableRow}>
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
        <PDFPageFooter companyName={companyName} />
      </Page>
    </Document>
  )
}
