import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import type { TemplateConfig } from "@/types/proposal"

interface LineItem {
  category: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  laborCost?: number | null
  materialCost?: number | null
}

interface BrandedEstimatePDFProps {
  title: string
  description: string
  lineItems: LineItem[]
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

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function groupByCategory(items: LineItem[]): Record<string, LineItem[]> {
  const groups: Record<string, LineItem[]> = {}
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return groups
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
  const { colors, header, body, totals, footer } = templateConfig
  const grouped = groupByCategory(lineItems)
  const totalLabor = lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0)
  const totalMaterial = lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0)
  const hasLaborData = totalLabor > 0 || totalMaterial > 0

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: body.fontFamily || "Helvetica",
      color: colors.text,
      backgroundColor: colors.background,
    },
    headerContainer: {
      marginBottom: 24,
      padding: 16,
      backgroundColor: header.bgColor || colors.primary,
      borderRadius: 6,
      flexDirection: header.logoPosition === "center" ? "column" : "row",
      alignItems: header.logoPosition === "center" ? "center" : "flex-start",
      gap: 12,
      borderLeftWidth: header.borderStyle === "accent" ? 5 : 0,
      borderLeftColor: colors.accent,
    },
    logo: {
      width: 60,
      height: 60,
      objectFit: "contain" as const,
    },
    headerText: {
      color: "#FFFFFF",
    },
    companyName: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 2,
    },
    tagline: {
      fontSize: 10,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 4,
    },
    contactInfo: {
      fontSize: 9,
      color: "rgba(255,255,255,0.7)",
    },
    estimateTitle: {
      fontSize: 11,
      color: "rgba(255,255,255,0.9)",
      marginTop: 6,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.primary}30`,
    },
    descriptionText: {
      fontSize: 10,
      color: colors.text,
      lineHeight: 1.5,
    },
    table: {
      width: "100%",
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: `${colors.primary}15`,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.primary}30`,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#E5E7EB",
    },
    tableRowAlt: {
      backgroundColor: body.alternateRowBg ? `${colors.secondary}08` : "transparent",
    },
    categoryRow: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: body.categoryStyle === "banner" ? `${colors.primary}10` : "transparent",
      borderBottomWidth: body.categoryStyle === "underline" ? 2 : 0,
      borderBottomColor: colors.primary,
    },
    colDesc: { flex: 2 },
    colQty: { width: 35, textAlign: "right" },
    colUnit: { width: 30, textAlign: "center" },
    colUnitCost: { width: 55, textAlign: "right" },
    colLabor: { width: 55, textAlign: "right" },
    colMaterial: { width: 55, textAlign: "right" },
    colTotal: { width: 65, textAlign: "right" },
    bold: { fontWeight: "bold" },
    headerTextSmall: { fontWeight: "bold", fontSize: 9, color: colors.primary },
    totalSection: {
      marginTop: 16,
      alignItems: "flex-end",
    },
    totalBox: {
      width: 220,
      padding: totals.style === "boxed" ? 12 : 0,
      backgroundColor: totals.style === "boxed" ? `${colors.primary}08` : "transparent",
      borderWidth: totals.style === "boxed" ? 1 : 0,
      borderColor: `${colors.primary}20`,
      borderRadius: totals.style === "boxed" ? 6 : 0,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
    },
    grandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      borderTopWidth: 2,
      borderTopColor: totals.highlightColor,
      marginTop: 4,
    },
    grandTotalText: {
      fontSize: 14,
      fontWeight: "bold",
      color: totals.highlightColor,
    },
    notes: {
      marginTop: 12,
      padding: 10,
      backgroundColor: `${colors.secondary}05`,
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    noteText: {
      fontSize: 9,
      color: "#6B7280",
      marginBottom: 2,
    },
    footerText: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8,
      color: "#9CA3AF",
    },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Branded Header */}
        <View style={styles.headerContainer}>
          {logoPath && header.logoPosition === "left" && (
            <Image src={logoPath} style={styles.logo} />
          )}
          <View style={header.logoPosition === "center" ? { alignItems: "center" } : {}}>
            {logoPath && header.logoPosition === "center" && (
              <Image src={logoPath} style={{ ...styles.logo, marginBottom: 8 }} />
            )}
            <Text style={styles.companyName}>
              {companyName || "Company Name"}
            </Text>
            {header.showTagline && companyTagline && (
              <Text style={styles.tagline}>{companyTagline}</Text>
            )}
            {companyPhone && <Text style={styles.contactInfo}>{companyPhone}</Text>}
            {companyEmail && <Text style={styles.contactInfo}>{companyEmail}</Text>}
            {companyAddress && <Text style={styles.contactInfo}>{companyAddress}</Text>}
            <Text style={styles.estimateTitle}>Estimate: {title}</Text>
          </View>
        </View>

        {/* Date */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 9, color: "#9CA3AF" }}>Date: {createdAt}</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Description</Text>
          <Text style={styles.descriptionText}>{description}</Text>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimate Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.colDesc, ...styles.headerTextSmall }}>Description</Text>
              <Text style={{ ...styles.colQty, ...styles.headerTextSmall }}>Qty</Text>
              <Text style={{ ...styles.colUnit, ...styles.headerTextSmall }}>Unit</Text>
              <Text style={{ ...styles.colUnitCost, ...styles.headerTextSmall }}>Unit Cost</Text>
              {hasLaborData && (
                <>
                  <Text style={{ ...styles.colLabor, ...styles.headerTextSmall }}>Labor</Text>
                  <Text style={{ ...styles.colMaterial, ...styles.headerTextSmall }}>Material</Text>
                </>
              )}
              <Text style={{ ...styles.colTotal, ...styles.headerTextSmall }}>Total</Text>
            </View>
            {Object.entries(grouped).map(([category, items]) => (
              <View key={category}>
                <View style={styles.categoryRow}>
                  <Text style={{ ...styles.bold, fontSize: 10, color: colors.primary }}>
                    {category}
                  </Text>
                </View>
                {items.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      ...styles.tableRow,
                      ...(idx % 2 === 1 ? styles.tableRowAlt : {}),
                    }}
                  >
                    <Text style={styles.colDesc}>{item.description}</Text>
                    <Text style={styles.colQty}>{item.quantity.toLocaleString()}</Text>
                    <Text style={styles.colUnit}>{item.unit}</Text>
                    <Text style={styles.colUnitCost}>{formatCurrency(item.unitCost)}</Text>
                    {hasLaborData && (
                      <>
                        <Text style={styles.colLabor}>
                          {item.laborCost ? formatCurrency(item.laborCost) : "\u2014"}
                        </Text>
                        <Text style={styles.colMaterial}>
                          {item.materialCost ? formatCurrency(item.materialCost) : "\u2014"}
                        </Text>
                      </>
                    )}
                    <Text style={{ ...styles.colTotal, ...styles.bold }}>
                      {formatCurrency(item.totalCost)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            {hasLaborData && (
              <>
                <View style={styles.totalRow}>
                  <Text>Total Labor</Text>
                  <Text>{formatCurrency(totalLabor)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>Total Materials</Text>
                  <Text>{formatCurrency(totalMaterial)}</Text>
                </View>
              </>
            )}
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text style={styles.bold}>{formatCurrency(subtotal)}</Text>
            </View>
            {markupPercent > 0 && (
              <View style={styles.totalRow}>
                <Text>Markup ({markupPercent}%)</Text>
                <Text>{formatCurrency(markupAmount)}</Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View style={styles.totalRow}>
                <Text>Tax</Text>
                <Text>{formatCurrency(taxAmount)}</Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalText}>Total</Text>
              <Text style={styles.grandTotalText}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Assumptions */}
        {assumptions && assumptions.length > 0 && (
          <View style={styles.notes}>
            <Text style={{ ...styles.bold, fontSize: 9, marginBottom: 4 }}>Assumptions:</Text>
            {assumptions.map((a, i) => (
              <Text key={i} style={styles.noteText}>
                {"\u2022"} {a}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footerText}>
          {footer.showGeneratedBy ? "Generated by EstimAI Pro — estimaipro.com" : ""}
          {footer.customText ? ` | ${footer.customText}` : ""}
        </Text>
      </Page>
    </Document>
  )
}
