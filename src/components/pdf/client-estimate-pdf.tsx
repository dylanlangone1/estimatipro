import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"

interface CategorySummary {
  category: string
  narrative: string
  clientTotal: number
  itemCount: number
}

interface ClientEstimatePDFProps {
  title: string
  description: string
  categories: CategorySummary[]
  clientSubtotal: number
  taxAmount: number
  clientTotal: number
  createdAt: string
  companyName?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyTagline?: string
  clientName?: string
  logoPath?: string
  primaryColor?: string
  accentColor?: string
  /** PRO+ gets terms/signature pages */
  includeTerms?: boolean
}

function fmt(amount: number) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ClientEstimatePDF({
  title,
  description,
  categories,
  clientSubtotal,
  taxAmount,
  clientTotal,
  createdAt,
  companyName,
  companyPhone,
  companyEmail,
  companyAddress,
  companyTagline,
  clientName,
  logoPath,
  primaryColor = "#E94560",
  accentColor = "#1A1A2E",
  includeTerms = false,
}: ClientEstimatePDFProps) {
  const s = StyleSheet.create({
    // ─── Cover Page ───
    coverPage: {
      padding: 0,
      backgroundColor: "#FFFFFF",
      fontFamily: "Helvetica",
    },
    coverBanner: {
      backgroundColor: primaryColor,
      paddingVertical: 50,
      paddingHorizontal: 60,
      marginBottom: 0,
    },
    coverLogo: {
      width: 72,
      height: 72,
      objectFit: "contain" as const,
      marginBottom: 16,
    },
    coverCompany: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    coverTagline: {
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 0,
    },
    coverBody: {
      paddingHorizontal: 60,
      paddingTop: 50,
    },
    coverLabel: {
      fontSize: 11,
      color: "#9CA3AF",
      textTransform: "uppercase" as const,
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    coverTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: accentColor,
      marginBottom: 30,
    },
    coverMeta: {
      flexDirection: "row",
      gap: 40,
      marginBottom: 50,
    },
    coverMetaBlock: {
      flex: 1,
    },
    coverMetaLabel: {
      fontSize: 9,
      color: "#9CA3AF",
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: 4,
    },
    coverMetaValue: {
      fontSize: 12,
      color: "#374151",
    },
    coverTotalBlock: {
      backgroundColor: `${primaryColor}08`,
      borderWidth: 1,
      borderColor: `${primaryColor}20`,
      borderRadius: 8,
      padding: 24,
      alignItems: "center" as const,
      marginBottom: 50,
    },
    coverTotalLabel: {
      fontSize: 11,
      color: "#9CA3AF",
      textTransform: "uppercase" as const,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    coverTotalAmount: {
      fontSize: 36,
      fontWeight: "bold",
      color: primaryColor,
    },
    coverContact: {
      position: "absolute" as const,
      bottom: 50,
      left: 60,
      right: 60,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "#E5E7EB",
      paddingTop: 16,
    },
    coverContactText: {
      fontSize: 9,
      color: "#6B7280",
    },

    // ─── Content Pages ───
    page: {
      padding: 50,
      paddingBottom: 70,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#374151",
    },
    pageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
    },
    pageHeaderLogo: {
      width: 36,
      height: 36,
      objectFit: "contain" as const,
    },
    pageHeaderTitle: {
      fontSize: 8,
      color: "#9CA3AF",
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: accentColor,
      marginBottom: 16,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
    },
    descriptionText: {
      fontSize: 10,
      lineHeight: 1.6,
      color: "#374151",
      marginBottom: 24,
    },

    // ─── Category Blocks ───
    categoryBlock: {
      marginBottom: 20,
    },
    categoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: `${primaryColor}10`,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 4,
      marginBottom: 6,
    },
    categoryName: {
      fontSize: 12,
      fontWeight: "bold",
      color: accentColor,
    },
    categoryTotal: {
      fontSize: 12,
      fontWeight: "bold",
      color: primaryColor,
    },
    categoryNarrative: {
      fontSize: 10,
      lineHeight: 1.5,
      color: "#6B7280",
      paddingHorizontal: 12,
    },

    // ─── Pricing Summary ───
    pricingSummary: {
      marginTop: 30,
      borderTopWidth: 2,
      borderTopColor: primaryColor,
      paddingTop: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    summaryLabel: {
      fontSize: 10,
      color: "#6B7280",
    },
    summaryValue: {
      fontSize: 10,
      fontWeight: "bold",
      color: "#374151",
    },
    summaryDivider: {
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
      marginVertical: 4,
      marginHorizontal: 12,
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: `${primaryColor}10`,
      borderRadius: 4,
      marginTop: 4,
    },
    grandTotalLabel: {
      fontSize: 14,
      fontWeight: "bold",
      color: accentColor,
    },
    grandTotalValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: primaryColor,
    },

    // ─── Terms Page ───
    termsSection: {
      marginBottom: 20,
    },
    termsTitle: {
      fontSize: 12,
      fontWeight: "bold",
      color: accentColor,
      marginBottom: 8,
    },
    termsText: {
      fontSize: 9,
      lineHeight: 1.6,
      color: "#6B7280",
    },

    // ─── Signature Page ───
    sigBlock: {
      marginTop: 20,
      borderTopWidth: 1,
      borderTopColor: "#E5E7EB",
      paddingTop: 16,
    },
    sigRow: {
      flexDirection: "row",
      gap: 40,
      marginTop: 40,
    },
    sigColumn: {
      flex: 1,
    },
    sigLine: {
      borderBottomWidth: 1,
      borderBottomColor: "#374151",
      marginBottom: 6,
      height: 30,
    },
    sigLabel: {
      fontSize: 9,
      color: "#9CA3AF",
    },

    // ─── Footer ───
    footer: {
      position: "absolute" as const,
      bottom: 30,
      left: 50,
      right: 50,
      textAlign: "center" as const,
      fontSize: 7,
      color: "#D1D5DB",
    },
  })

  // Strip project location / permit note from description for client display
  const cleanDescription = description
    .split("\n\nPROJECT LOCATION:")[0]
    .split("\n\nPERMIT NOTE:")[0]
    .trim()

  return (
    <Document>
      {/* ═══ PAGE 1: COVER ═══ */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverBanner}>
          {logoPath && <Image src={logoPath} style={s.coverLogo} />}
          <Text style={s.coverCompany}>{companyName || "Estimate"}</Text>
          {companyTagline && <Text style={s.coverTagline}>{companyTagline}</Text>}
        </View>

        <View style={s.coverBody}>
          <Text style={s.coverLabel}>Project Estimate</Text>
          <Text style={s.coverTitle}>{title}</Text>

          <View style={s.coverMeta}>
            {clientName && (
              <View style={s.coverMetaBlock}>
                <Text style={s.coverMetaLabel}>Prepared For</Text>
                <Text style={s.coverMetaValue}>{clientName}</Text>
              </View>
            )}
            <View style={s.coverMetaBlock}>
              <Text style={s.coverMetaLabel}>Date</Text>
              <Text style={s.coverMetaValue}>{createdAt}</Text>
            </View>
            <View style={s.coverMetaBlock}>
              <Text style={s.coverMetaLabel}>Categories</Text>
              <Text style={s.coverMetaValue}>{categories.length} work areas</Text>
            </View>
          </View>

          <View style={s.coverTotalBlock}>
            <Text style={s.coverTotalLabel}>Total Investment</Text>
            <Text style={s.coverTotalAmount}>{fmt(clientTotal)}</Text>
          </View>
        </View>

        <View style={s.coverContact}>
          <Text style={s.coverContactText}>
            {[companyName, companyPhone].filter(Boolean).join(" | ")}
          </Text>
          <Text style={s.coverContactText}>
            {[companyEmail, companyAddress].filter(Boolean).join(" | ")}
          </Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: SCOPE & PRICING ═══ */}
      <Page size="A4" style={s.page}>
        {/* Page header */}
        <View style={s.pageHeader}>
          {logoPath && <Image src={logoPath} style={s.pageHeaderLogo} />}
          <Text style={s.pageHeaderTitle}>{title} — Scope &amp; Pricing</Text>
        </View>

        {/* Project Overview */}
        <Text style={s.sectionTitle}>Project Overview</Text>
        <Text style={s.descriptionText}>{cleanDescription}</Text>

        {/* Scope of Work */}
        <Text style={s.sectionTitle}>Scope of Work</Text>
        {categories.map((cat) => (
          <View key={cat.category} style={s.categoryBlock} wrap={false}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryName}>{cat.category}</Text>
              <Text style={s.categoryTotal}>{fmt(cat.clientTotal)}</Text>
            </View>
            {cat.narrative ? (
              <Text style={s.categoryNarrative}>{cat.narrative}</Text>
            ) : (
              <Text style={s.categoryNarrative}>
                Includes {cat.itemCount} item{cat.itemCount !== 1 ? "s" : ""} — materials, labor, and installation.
              </Text>
            )}
          </View>
        ))}

        {/* Pricing Summary */}
        <View style={s.pricingSummary}>
          <Text style={{ ...s.sectionTitle, borderBottomWidth: 0, marginBottom: 8 }}>
            Investment Summary
          </Text>
          {categories.map((cat) => (
            <View key={cat.category} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{cat.category}</Text>
              <Text style={s.summaryValue}>{fmt(cat.clientTotal)}</Text>
            </View>
          ))}
          <View style={s.summaryDivider} />
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>{fmt(clientSubtotal)}</Text>
          </View>
          {taxAmount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Tax</Text>
              <Text style={s.summaryValue}>{fmt(taxAmount)}</Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Total Investment</Text>
            <Text style={s.grandTotalValue}>{fmt(clientTotal)}</Text>
          </View>
        </View>

        <Text style={s.footer}>Generated by EstimAI Pro — estimaipro.com</Text>
      </Page>

      {/* ═══ PAGE 3: TERMS (PRO+ only) ═══ */}
      {includeTerms && (
        <Page size="A4" style={s.page}>
          <View style={s.pageHeader}>
            {logoPath && <Image src={logoPath} style={s.pageHeaderLogo} />}
            <Text style={s.pageHeaderTitle}>{title} — Terms &amp; Conditions</Text>
          </View>

          <Text style={s.sectionTitle}>Terms &amp; Conditions</Text>

          <View style={s.termsSection}>
            <Text style={s.termsTitle}>1. Payment Terms</Text>
            <Text style={s.termsText}>
              A deposit of 30% of the total project cost is required prior to commencement of work. Progress payments shall be made at milestones agreed upon by both parties. Final payment is due upon substantial completion and client walkthrough. All payments are due within 15 days of invoice date.
            </Text>
          </View>

          <View style={s.termsSection}>
            <Text style={s.termsTitle}>2. Project Timeline</Text>
            <Text style={s.termsText}>
              Work shall commence within 14 business days of contract signing and receipt of deposit, subject to material availability and permitting requirements. Any delays caused by weather, material shortages, or client-requested changes may extend the timeline. Contractor shall keep client informed of progress and any anticipated schedule changes.
            </Text>
          </View>

          <View style={s.termsSection}>
            <Text style={s.termsTitle}>3. Change Orders</Text>
            <Text style={s.termsText}>
              Any changes to the scope of work after contract signing shall be documented in writing as a Change Order. Change Orders will include a description of the additional or modified work, associated costs, and impact to timeline. No additional work shall begin until the Change Order is approved and signed by both parties.
            </Text>
          </View>

          <View style={s.termsSection}>
            <Text style={s.termsTitle}>4. Warranty</Text>
            <Text style={s.termsText}>
              Contractor warrants all workmanship for a period of one (1) year from date of substantial completion. Manufacturer warranties on materials and products are passed through to the client. This warranty does not cover damage resulting from misuse, neglect, or normal wear and tear.
            </Text>
          </View>

          <View style={s.termsSection}>
            <Text style={s.termsTitle}>5. Exclusions</Text>
            <Text style={s.termsText}>
              Unless specifically included in the scope of work above, the following are excluded: permit fees, engineering or architectural drawings, hazardous material abatement (asbestos, lead paint), unforeseen structural repairs, landscaping restoration beyond immediate work area, and furniture/appliance relocation.
            </Text>
          </View>

          <View style={s.termsSection}>
            <Text style={s.termsTitle}>6. Insurance &amp; Liability</Text>
            <Text style={s.termsText}>
              Contractor maintains general liability insurance and workers compensation coverage. Certificates of insurance are available upon request. Client is responsible for maintaining homeowner insurance during the project period. Contractor is not liable for pre-existing conditions discovered during construction.
            </Text>
          </View>

          <Text style={s.footer}>Generated by EstimAI Pro — estimaipro.com</Text>
        </Page>
      )}

      {/* ═══ PAGE 4: SIGNATURE (PRO+ only) ═══ */}
      {includeTerms && (
        <Page size="A4" style={s.page}>
          <View style={s.pageHeader}>
            {logoPath && <Image src={logoPath} style={s.pageHeaderLogo} />}
            <Text style={s.pageHeaderTitle}>{title} — Acceptance</Text>
          </View>

          <Text style={s.sectionTitle}>Acceptance &amp; Authorization</Text>

          <Text style={{ ...s.descriptionText, marginBottom: 8 }}>
            By signing below, both parties agree to the scope of work, pricing, and terms outlined in this estimate. This document serves as a binding agreement upon execution.
          </Text>

          <View style={s.coverTotalBlock}>
            <Text style={s.coverTotalLabel}>Agreed Total</Text>
            <Text style={{ ...s.coverTotalAmount, fontSize: 28 }}>{fmt(clientTotal)}</Text>
          </View>

          <View style={s.sigRow}>
            <View style={s.sigColumn}>
              <Text style={{ ...s.termsTitle, marginBottom: 40 }}>Client</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Signature</Text>
              <View style={{ ...s.sigLine, marginTop: 24 }} />
              <Text style={s.sigLabel}>Printed Name</Text>
              <View style={{ ...s.sigLine, marginTop: 24 }} />
              <Text style={s.sigLabel}>Date</Text>
            </View>

            <View style={s.sigColumn}>
              <Text style={{ ...s.termsTitle, marginBottom: 40 }}>Contractor</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Signature</Text>
              <View style={{ ...s.sigLine, marginTop: 24 }} />
              <Text style={s.sigLabel}>
                {companyName || "Company Representative"}
              </Text>
              <View style={{ ...s.sigLine, marginTop: 24 }} />
              <Text style={s.sigLabel}>Date</Text>
            </View>
          </View>

          <Text style={s.footer}>Generated by EstimAI Pro — estimaipro.com</Text>
        </Page>
      )}
    </Document>
  )
}
