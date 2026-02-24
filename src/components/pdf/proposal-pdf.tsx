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
import {
  PDFPageHeader,
  PDFPageFooter,
  PDFAccentBar,
} from "./pdf-shared-components"
import type { TemplateConfig, ProposalData, TermsSection } from "@/types/proposal"

interface ProposalPDFProps {
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
  clientName?: string
  logoPath?: string
  templateConfig: TemplateConfig
  proposalData: ProposalData
  termsStructured?: TermsSection[]
  isContract?: boolean
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
  termsStructured,
  isContract = false,
}: ProposalPDFProps) {
  const { colors: tc, header, body, totals, footer } = templateConfig
  const grouped = groupByCategory(lineItems)

  // Use Inter as default instead of Helvetica
  const fontFamily = body.fontFamily === "Helvetica" ? FONT_FAMILY : (body.fontFamily || FONT_FAMILY)

  const documentLabel = isContract ? "Construction Agreement" : "Project Proposal"

  const s = StyleSheet.create({
    // ─── Common ───
    page: {
      padding: PAGE_MARGIN,
      paddingBottom: PAGE_MARGIN_BOTTOM,
      fontSize: fontSize.md,
      fontFamily,
      color: tc.text,
      backgroundColor: tc.background,
    },
    pageTitle: {
      fontSize: fontSize["4xl"],
      fontWeight: fontWeight.bold,
      color: tc.primary,
      marginBottom: spacing[5],
      paddingBottom: spacing[2],
      borderBottomWidth: 2,
      borderBottomColor: tc.primary,
    },
    sectionTitle: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.semibold,
      color: tc.primary,
      marginBottom: spacing[2],
      marginTop: spacing[4],
    },
    bodyText: {
      fontSize: fontSize.md,
      color: tc.text,
      lineHeight: lineHeight.relaxed,
      marginBottom: spacing[2],
    },

    // ─── Cover ───
    coverPage: {
      padding: 0,
      backgroundColor: tc.background,
      fontFamily,
    },
    coverBanner: {
      backgroundColor: tc.primary,
      paddingVertical: 72,
      paddingHorizontal: 60,
    },
    coverLogo: {
      width: 100,
      height: 100,
      objectFit: "contain" as const,
      marginBottom: spacing[5],
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.2)",
      borderRadius: borderRadius.md,
    },
    coverCompanyName: {
      fontSize: 34,
      fontWeight: fontWeight.bold,
      color: colors.white,
      marginBottom: 4,
    },
    coverTagline: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.normal,
      color: "rgba(255,255,255,0.75)",
      marginBottom: spacing[8],
    },
    coverDivider: {
      width: 60,
      height: 3,
      backgroundColor: tc.accent,
      borderRadius: 1.5,
      marginBottom: spacing[8],
    },
    coverProjectTitle: {
      fontSize: fontSize["5xl"],
      fontWeight: fontWeight.bold,
      color: colors.white,
      marginBottom: spacing[2],
    },
    coverSubtitle: {
      fontSize: fontSize.xl,
      color: "rgba(255,255,255,0.7)",
    },
    coverDetails: {
      padding: 60,
    },
    coverDetailRow: {
      flexDirection: "row",
      gap: spacing[8],
      marginBottom: spacing[6],
    },
    coverDetailBlock: {
      flex: 1,
    },
    coverDetailLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: spacing[1],
    },
    coverDetailValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.medium,
      color: tc.text,
    },
    coverTotalCard: {
      backgroundColor: `${tc.primary}08`,
      borderWidth: 1.5,
      borderColor: `${tc.primary}25`,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing[6],
      paddingHorizontal: spacing[8],
      alignItems: "center",
      marginTop: spacing[4],
    },
    coverTotalLabel: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase",
      letterSpacing: 2,
      marginBottom: spacing[2],
    },
    coverTotalAmount: {
      fontSize: fontSize["7xl"],
      fontWeight: fontWeight.bold,
      color: tc.primary,
    },
    coverContactBar: {
      position: "absolute",
      bottom: 48,
      left: 60,
      right: 60,
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing[4],
      borderTopWidth: 1,
      borderTopColor: colors.gray200,
      paddingTop: spacing[4],
    },
    coverContactText: {
      fontSize: fontSize.base,
      color: colors.gray400,
    },

    // ─── About Us ───
    aboutContainer: {
      flexDirection: "row",
      gap: spacing[6],
    },
    aboutCard: {
      width: "30%",
      backgroundColor: `${tc.primary}06`,
      borderRadius: borderRadius.md,
      padding: spacing[4],
      borderLeftWidth: 3,
      borderLeftColor: tc.primary,
    },
    aboutCardLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: spacing[1],
    },
    aboutCardValue: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: tc.text,
      marginBottom: spacing[3],
    },
    aboutNarrative: {
      flex: 1,
    },

    // ─── Scope ───
    scopeBlock: {
      marginBottom: spacing[5],
      borderLeftWidth: 3,
      borderLeftColor: tc.primary,
      paddingLeft: spacing[4],
    },
    scopeCategory: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: tc.secondary || tc.text,
      marginBottom: spacing[1],
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
      borderLeftWidth: 3,
      borderLeftColor: tc.primary,
    },
    colDesc: { flex: 3 },
    colQty: { width: 50, textAlign: "right" },
    colUnit: { width: 40, textAlign: "center" },
    colUnitCost: { width: 70, textAlign: "right" },
    colTotal: { width: 80, textAlign: "right" },
    bold: { fontWeight: fontWeight.semibold },
    muted: { color: colors.gray500 },

    // ─── Totals ───
    totalSection: { marginTop: spacing[5], alignItems: "flex-end" },
    totalBox: {
      width: 240,
      padding: totals.style === "boxed" ? spacing[4] : 0,
      backgroundColor: totals.style === "boxed" ? `${tc.primary}06` : "transparent",
      borderWidth: totals.style === "boxed" ? 1 : 0,
      borderColor: `${tc.primary}20`,
      borderRadius: totals.style === "boxed" ? borderRadius.md : 0,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 3,
    },
    grandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing[2],
      borderTopWidth: 2,
      borderTopColor: totals.highlightColor,
      marginTop: spacing[1],
    },
    grandTotalText: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: totals.highlightColor,
    },

    // ─── Timeline ───
    timelineItem: {
      flexDirection: "row",
      marginBottom: spacing[5],
    },
    timelineBar: {
      width: 2,
      backgroundColor: tc.primary,
      marginRight: spacing[4],
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: tc.primary,
      position: "absolute",
      left: -5,
      top: 2,
    },
    timelineContent: {
      flex: 1,
      paddingLeft: spacing[2],
    },
    timelinePhase: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: tc.text,
      marginBottom: 2,
    },
    timelineDuration: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: tc.primary,
      marginBottom: spacing[1],
    },

    // ─── Terms ───
    termsItem: {
      marginBottom: spacing[5],
    },
    termsItemHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing[2],
    },
    termsNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: tc.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing[3],
    },
    termsNumberText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    termsTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: tc.secondary || tc.text,
    },
    termsContent: {
      fontSize: fontSize.base,
      lineHeight: lineHeight.relaxed,
      color: colors.gray500,
      paddingLeft: 34,
    },

    // ─── Signature ───
    sigContainer: {
      marginTop: spacing[10],
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing[10],
    },
    sigColumn: { flex: 1 },
    sigLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.gray300,
      width: 200,
      marginBottom: spacing[1],
      marginTop: spacing[8],
    },
    sigLabel: {
      fontSize: fontSize.base,
      color: colors.gray400,
    },
    contractNotice: {
      backgroundColor: `${tc.secondary}08`,
      borderWidth: 1.5,
      borderColor: `${tc.secondary}30`,
      borderRadius: borderRadius.md,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      marginBottom: spacing[6],
    },
    contractNoticeText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: tc.secondary || tc.text,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
  })

  const enabledTerms = (termsStructured || []).filter((t) => t.enabled)

  return (
    <Document>
      {/* ═══ PAGE 1: COVER ═══ */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverBanner}>
          {logoPath && <Image src={logoPath} style={s.coverLogo} />}
          <Text style={s.coverCompanyName}>{companyName || "Company Name"}</Text>
          {companyTagline && <Text style={s.coverTagline}>{companyTagline}</Text>}
          <View style={s.coverDivider} />
          <Text style={s.coverProjectTitle}>{documentLabel}</Text>
          <Text style={s.coverSubtitle}>{title}</Text>
        </View>

        <View style={s.coverDetails}>
          <View style={s.coverDetailRow}>
            {clientName && (
              <View style={s.coverDetailBlock}>
                <Text style={s.coverDetailLabel}>Prepared For</Text>
                <Text style={s.coverDetailValue}>{clientName}</Text>
              </View>
            )}
            <View style={s.coverDetailBlock}>
              <Text style={s.coverDetailLabel}>Date</Text>
              <Text style={s.coverDetailValue}>{createdAt}</Text>
            </View>
          </View>

          <View style={s.coverTotalCard}>
            <Text style={s.coverTotalLabel}>Total Investment</Text>
            <Text style={s.coverTotalAmount}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        <View style={s.coverContactBar}>
          {companyPhone && <Text style={s.coverContactText}>{companyPhone}</Text>}
          {companyPhone && companyEmail && <Text style={s.coverContactText}>|</Text>}
          {companyEmail && <Text style={s.coverContactText}>{companyEmail}</Text>}
          {companyEmail && companyAddress && <Text style={s.coverContactText}>|</Text>}
          {companyAddress && <Text style={s.coverContactText}>{companyAddress}</Text>}
        </View>
      </Page>

      {/* ═══ PAGE 2: ABOUT US ═══ */}
      <Page size="A4" style={s.page}>
        <PDFPageHeader logoPath={logoPath} companyName={companyName} pageLabel="About Us" color={tc.primary} />
        <Text style={s.pageTitle}>About Us</Text>

        <View style={s.aboutContainer}>
          {/* Company card */}
          <View style={s.aboutCard}>
            {logoPath && (
              <Image src={logoPath} style={{ width: 48, height: 48, objectFit: "contain" as const, marginBottom: spacing[3] }} />
            )}
            <Text style={s.aboutCardLabel}>Company</Text>
            <Text style={s.aboutCardValue}>{companyName || "Our Company"}</Text>
            {companyPhone && (
              <>
                <Text style={s.aboutCardLabel}>Phone</Text>
                <Text style={{ ...s.aboutCardValue, fontSize: fontSize.base }}>{companyPhone}</Text>
              </>
            )}
            {companyEmail && (
              <>
                <Text style={s.aboutCardLabel}>Email</Text>
                <Text style={{ ...s.aboutCardValue, fontSize: fontSize.base }}>{companyEmail}</Text>
              </>
            )}
          </View>

          {/* Narrative */}
          <View style={s.aboutNarrative}>
            <Text style={s.bodyText}>{proposalData.aboutUs}</Text>
          </View>
        </View>

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══ PAGE 3: SCOPE OF WORK ═══ */}
      <Page size="A4" style={s.page}>
        <PDFPageHeader logoPath={logoPath} companyName={companyName} pageLabel="Scope of Work" color={tc.primary} />
        <Text style={s.pageTitle}>Scope of Work</Text>
        <Text style={s.bodyText}>{description}</Text>

        {(proposalData.scopeOfWork || []).map((scope, i) => (
          <View key={i} style={s.scopeBlock} wrap={false}>
            <Text style={s.scopeCategory}>{scope.category}</Text>
            <Text style={s.bodyText}>{scope.narrative}</Text>
          </View>
        ))}

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══ PAGE 4-5: DETAILED ESTIMATE ═══ */}
      <Page size="A4" style={s.page}>
        <PDFPageHeader logoPath={logoPath} companyName={companyName} pageLabel="Detailed Estimate" color={tc.primary} />
        <Text style={s.pageTitle}>Detailed Estimate</Text>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={{ ...s.colDesc, ...s.tableHeaderText }}>Description</Text>
            <Text style={{ ...s.colQty, ...s.tableHeaderText }}>Qty</Text>
            <Text style={{ ...s.colUnit, ...s.tableHeaderText }}>Unit</Text>
            <Text style={{ ...s.colUnitCost, ...s.tableHeaderText }}>Unit Cost</Text>
            <Text style={{ ...s.colTotal, ...s.tableHeaderText }}>Total</Text>
          </View>
          {Object.entries(grouped).map(([category, items]) => (
            <View key={category}>
              <View style={s.categoryRow}>
                <Text style={{ ...s.bold, fontSize: fontSize.md, color: tc.primary }}>
                  {category}
                </Text>
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
                  <Text style={{ ...s.colTotal, ...s.bold }}>
                    {formatCurrency(item.totalCost)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalSection}>
          <View style={s.totalBox}>
            <View style={s.totalRow}>
              <Text style={s.muted}>Subtotal</Text>
              <Text style={s.bold}>{formatCurrency(subtotal)}</Text>
            </View>
            {markupPercent > 0 && (
              <View style={s.totalRow}>
                <Text style={s.muted}>Markup ({markupPercent}%)</Text>
                <Text>{formatCurrency(markupAmount)}</Text>
              </View>
            )}
            {taxAmount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.muted}>Tax</Text>
                <Text>{formatCurrency(taxAmount)}</Text>
              </View>
            )}
            <View style={s.grandTotal}>
              <Text style={s.grandTotalText}>Total</Text>
              <Text style={s.grandTotalText}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Assumptions */}
        {assumptions && assumptions.length > 0 && (
          <View style={{ marginTop: spacing[5], padding: spacing[3], backgroundColor: `${tc.secondary}05`, borderRadius: borderRadius.base, borderLeftWidth: 3, borderLeftColor: tc.accent }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.secondary, marginBottom: spacing[1] }}>
              Assumptions
            </Text>
            {assumptions.map((a, i) => (
              <Text key={i} style={{ fontSize: fontSize.base, color: colors.gray500, marginBottom: 2 }}>
                {"\u2022"} {a}
              </Text>
            ))}
          </View>
        )}

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══ PAGE 6: TIMELINE ═══ */}
      <Page size="A4" style={s.page}>
        <PDFPageHeader logoPath={logoPath} companyName={companyName} pageLabel="Timeline" color={tc.primary} />
        <Text style={s.pageTitle}>Project Timeline</Text>

        {(proposalData.timeline || []).map((phase, i) => (
          <View key={i} style={s.timelineItem} wrap={false}>
            <View style={s.timelineBar}>
              <View style={s.timelineDot} />
            </View>
            <View style={s.timelineContent}>
              <Text style={s.timelinePhase}>{phase.phase}</Text>
              <Text style={s.timelineDuration}>{phase.duration}</Text>
              <Text style={s.bodyText}>{phase.description}</Text>
            </View>
          </View>
        ))}

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══ PAGE 7: TERMS & CONDITIONS ═══ */}
      <Page size="A4" style={s.page}>
        <PDFPageHeader logoPath={logoPath} companyName={companyName} pageLabel="Terms & Conditions" color={tc.primary} />
        <Text style={s.pageTitle}>Terms &amp; Conditions</Text>

        {/* Contract preamble */}
        {isContract && (
          <Text style={{ ...s.bodyText, marginBottom: spacing[5] }}>
            This Construction Agreement (&quot;Agreement&quot;) is entered into between the
            Contractor identified herein and the Client. Both parties agree to the scope of
            work, pricing, and the following terms and conditions.
          </Text>
        )}

        {/* Structured terms (dynamic) */}
        {enabledTerms.length > 0 ? (
          enabledTerms.map((section, idx) => (
            <View key={section.id} style={s.termsItem} wrap={false}>
              <View style={s.termsItemHeader}>
                <View style={s.termsNumber}>
                  <Text style={s.termsNumberText}>{idx + 1}</Text>
                </View>
                <Text style={s.termsTitle}>{section.title}</Text>
              </View>
              <Text style={s.termsContent}>{section.content}</Text>
            </View>
          ))
        ) : (
          // Fallback to proposalData.terms if no structured terms
          <Text style={{ ...s.bodyText, color: colors.gray500, lineHeight: lineHeight.relaxed }}>
            {proposalData.terms}
          </Text>
        )}

        {/* Exclusions */}
        {proposalData.exclusions && (
          <View style={{ marginTop: spacing[5] }}>
            <Text style={s.sectionTitle}>Exclusions</Text>
            <Text style={{ ...s.bodyText, color: colors.gray500 }}>{proposalData.exclusions}</Text>
          </View>
        )}

        {/* Warranty */}
        {proposalData.warranty && (
          <View style={{ marginTop: spacing[5] }}>
            <Text style={s.sectionTitle}>Warranty</Text>
            <Text style={{ ...s.bodyText, color: colors.gray500 }}>{proposalData.warranty}</Text>
          </View>
        )}

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══ PAGE 8: ACCEPTANCE / SIGNATURE ═══ */}
      <Page size="A4" style={s.page}>
        <PDFPageHeader logoPath={logoPath} companyName={companyName} pageLabel={isContract ? "Agreement" : "Acceptance"} color={tc.primary} />
        <Text style={s.pageTitle}>
          {isContract ? "Acceptance & Authorization to Proceed" : "Acceptance"}
        </Text>

        {/* Contract notice */}
        {isContract && (
          <View style={s.contractNotice}>
            <Text style={s.contractNoticeText}>
              This is a binding agreement upon execution by both parties
            </Text>
          </View>
        )}

        <Text style={s.bodyText}>
          {isContract
            ? "By signing below, you acknowledge that you have reviewed this agreement and agree to the terms, scope of work, and pricing outlined herein. This document constitutes a binding contract upon execution."
            : "By signing below, you acknowledge that you have reviewed this proposal and agree to the terms, scope of work, and pricing outlined herein."}
        </Text>

        {/* Signature blocks */}
        <View style={s.sigContainer}>
          <View style={s.sigColumn}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Client Signature</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Printed Name</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Date</Text>
          </View>
          <View style={s.sigColumn}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Contractor Signature</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{companyName || "Company Representative"}</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Date</Text>
          </View>
        </View>

        {/* Company branding footer */}
        <View style={{ marginTop: spacing[16], alignItems: "center" }}>
          {logoPath && (
            <Image src={logoPath} style={{ width: 48, height: 48, objectFit: "contain" as const, marginBottom: spacing[2] }} />
          )}
          <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: tc.primary }}>
            {companyName}
          </Text>
          {companyPhone && <Text style={{ fontSize: fontSize.base, color: colors.gray400 }}>{companyPhone}</Text>}
          {companyEmail && <Text style={{ fontSize: fontSize.base, color: colors.gray400 }}>{companyEmail}</Text>}
          {companyAddress && <Text style={{ fontSize: fontSize.base, color: colors.gray400 }}>{companyAddress}</Text>}
        </View>

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>
    </Document>
  )
}
