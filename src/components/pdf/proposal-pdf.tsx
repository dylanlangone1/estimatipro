import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import type { TemplateConfig, ProposalData } from "@/types/proposal"

interface LineItem {
  category: string
  description: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
}

interface ProposalPDFProps {
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
  clientName?: string
  logoPath?: string
  templateConfig: TemplateConfig
  proposalData: ProposalData
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

export function ProposalPDF({
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
  clientName,
  logoPath,
  templateConfig,
  proposalData,
}: ProposalPDFProps) {
  const { colors, header, body, totals, footer } = templateConfig
  const grouped = groupByCategory(lineItems)

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: body.fontFamily || "Helvetica",
      color: colors.text,
      backgroundColor: colors.background,
    },
    // Cover page styles
    coverPage: {
      padding: 0,
      backgroundColor: colors.background,
    },
    coverBanner: {
      backgroundColor: colors.primary,
      padding: 60,
      paddingTop: 80,
      alignItems: "center",
      marginBottom: 0,
    },
    coverLogo: {
      width: 80,
      height: 80,
      objectFit: "contain" as const,
      marginBottom: 20,
    },
    coverCompanyName: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 6,
      textAlign: "center",
    },
    coverTagline: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 30,
      textAlign: "center",
    },
    coverDivider: {
      width: 60,
      height: 2,
      backgroundColor: colors.accent,
      marginBottom: 30,
    },
    coverProjectTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 8,
      textAlign: "center",
    },
    coverSubtitle: {
      fontSize: 12,
      color: "rgba(255,255,255,0.7)",
      textAlign: "center",
    },
    coverDetails: {
      padding: 60,
      alignItems: "center",
    },
    coverDetailLabel: {
      fontSize: 10,
      color: "#9CA3AF",
      marginBottom: 4,
    },
    coverDetailValue: {
      fontSize: 12,
      color: colors.text,
      marginBottom: 16,
    },
    // Content page styles
    pageTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 8,
      marginTop: 12,
    },
    bodyText: {
      fontSize: 10,
      color: colors.text,
      lineHeight: 1.6,
      marginBottom: 8,
    },
    // Table styles
    table: { width: "100%" },
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
    colDesc: { flex: 3 },
    colQty: { width: 50, textAlign: "right" },
    colUnit: { width: 40, textAlign: "center" },
    colUnitCost: { width: 70, textAlign: "right" },
    colTotal: { width: 80, textAlign: "right" },
    bold: { fontWeight: "bold" },
    headerTextSmall: { fontWeight: "bold", fontSize: 9, color: colors.primary },
    // Totals
    totalSection: { marginTop: 16, alignItems: "flex-end" },
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
    // Timeline
    timelineRow: {
      flexDirection: "row",
      marginBottom: 10,
      paddingLeft: 8,
    },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 3,
      marginRight: 12,
    },
    // Terms
    termsParagraph: {
      fontSize: 9,
      color: "#6B7280",
      lineHeight: 1.6,
      marginBottom: 10,
    },
    // Signature
    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: "#D1D5DB",
      width: 200,
      marginBottom: 4,
      marginTop: 30,
    },
    signatureLabel: {
      fontSize: 9,
      color: "#9CA3AF",
    },
    // Footer
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
      {/* Page 1: Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverBanner}>
          {logoPath && (
            <Image src={logoPath} style={styles.coverLogo} />
          )}
          <Text style={styles.coverCompanyName}>{companyName || "Company Name"}</Text>
          {companyTagline && <Text style={styles.coverTagline}>{companyTagline}</Text>}
          <View style={styles.coverDivider} />
          <Text style={styles.coverProjectTitle}>Project Proposal</Text>
          <Text style={styles.coverSubtitle}>{title}</Text>
        </View>
        <View style={styles.coverDetails}>
          {clientName && (
            <>
              <Text style={styles.coverDetailLabel}>Prepared For</Text>
              <Text style={styles.coverDetailValue}>{clientName}</Text>
            </>
          )}
          <Text style={styles.coverDetailLabel}>Date</Text>
          <Text style={styles.coverDetailValue}>{createdAt}</Text>
          <Text style={styles.coverDetailLabel}>Total Investment</Text>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
        <Text style={styles.footerText}>
          {companyPhone && `${companyPhone} | `}
          {companyEmail && `${companyEmail} | `}
          {companyAddress || ""}
        </Text>
      </Page>

      {/* Page 2: About Us */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>About Us</Text>
        <Text style={styles.bodyText}>{proposalData.aboutUs}</Text>
        <Text style={styles.footerText}>
          {footer.showGeneratedBy ? "Generated by EstimAI Pro" : ""}
        </Text>
      </Page>

      {/* Page 3: Scope of Work */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Scope of Work</Text>
        <Text style={styles.bodyText}>{description}</Text>
        {proposalData.scopeOfWork.map((scope, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>{scope.category}</Text>
            <Text style={styles.bodyText}>{scope.narrative}</Text>
          </View>
        ))}
        <Text style={styles.footerText}>
          {footer.showGeneratedBy ? "Generated by EstimAI Pro" : ""}
        </Text>
      </Page>

      {/* Page 4-5: Detailed Estimate */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Detailed Estimate</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.colDesc, ...styles.headerTextSmall }}>Description</Text>
            <Text style={{ ...styles.colQty, ...styles.headerTextSmall }}>Qty</Text>
            <Text style={{ ...styles.colUnit, ...styles.headerTextSmall }}>Unit</Text>
            <Text style={{ ...styles.colUnitCost, ...styles.headerTextSmall }}>Unit Cost</Text>
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
                  <Text style={{ ...styles.colTotal, ...styles.bold }}>
                    {formatCurrency(item.totalCost)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
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

        {assumptions && assumptions.length > 0 && (
          <View style={{ marginTop: 16, padding: 10, backgroundColor: `${colors.secondary}05`, borderRadius: 4 }}>
            <Text style={{ ...styles.bold, fontSize: 9, marginBottom: 4 }}>Assumptions:</Text>
            {assumptions.map((a, i) => (
              <Text key={i} style={{ fontSize: 9, color: "#6B7280", marginBottom: 2 }}>
                {"\u2022"} {a}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.footerText}>
          {footer.showGeneratedBy ? "Generated by EstimAI Pro" : ""}
        </Text>
      </Page>

      {/* Page 6: Timeline */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Project Timeline</Text>
        {proposalData.timeline.map((phase, i) => (
          <View key={i} style={styles.timelineRow}>
            <View style={styles.timelineDot} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...styles.bold, fontSize: 11, marginBottom: 2 }}>
                {phase.phase}
              </Text>
              <Text style={{ fontSize: 9, color: colors.primary, marginBottom: 4 }}>
                Duration: {phase.duration}
              </Text>
              <Text style={styles.bodyText}>{phase.description}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.footerText}>
          {footer.showGeneratedBy ? "Generated by EstimAI Pro" : ""}
        </Text>
      </Page>

      {/* Page 7: Terms & Conditions */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Terms & Conditions</Text>
        <Text style={styles.termsParagraph}>{proposalData.terms}</Text>
        <Text style={styles.footerText}>
          {footer.showGeneratedBy ? "Generated by EstimAI Pro" : ""}
        </Text>
      </Page>

      {/* Page 8: Closing / Signature */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Acceptance</Text>
        <Text style={styles.bodyText}>
          By signing below, you acknowledge that you have reviewed this proposal and agree to the
          terms, scope of work, and pricing outlined herein.
        </Text>

        <View style={{ marginTop: 40, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Client Signature</Text>
            <View style={{ ...styles.signatureLine, marginTop: 20 }} />
            <Text style={styles.signatureLabel}>Printed Name</Text>
            <View style={{ ...styles.signatureLine, marginTop: 20 }} />
            <Text style={styles.signatureLabel}>Date</Text>
          </View>
          <View>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Contractor Signature</Text>
            <View style={{ ...styles.signatureLine, marginTop: 20 }} />
            <Text style={styles.signatureLabel}>{companyName || "Company Representative"}</Text>
            <View style={{ ...styles.signatureLine, marginTop: 20 }} />
            <Text style={styles.signatureLabel}>Date</Text>
          </View>
        </View>

        <View style={{ marginTop: 60, alignItems: "center" }}>
          {logoPath && (
            <Image src={logoPath} style={{ width: 40, height: 40, objectFit: "contain" as const, marginBottom: 8 }} />
          )}
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primary }}>
            {companyName}
          </Text>
          {companyPhone && <Text style={{ fontSize: 9, color: "#9CA3AF" }}>{companyPhone}</Text>}
          {companyEmail && <Text style={{ fontSize: 9, color: "#9CA3AF" }}>{companyEmail}</Text>}
          {companyAddress && <Text style={{ fontSize: 9, color: "#9CA3AF" }}>{companyAddress}</Text>}
        </View>

        <Text style={styles.footerText}>
          {footer.showGeneratedBy ? "Generated by EstimAI Pro — estimaipro.com" : ""}
          {footer.customText ? ` | ${footer.customText}` : ""}
        </Text>
      </Page>
    </Document>
  )
}
