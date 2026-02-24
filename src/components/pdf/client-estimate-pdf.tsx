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
} from "./pdf-design-system"
import {
  PDFPageHeader,
  PDFPageFooter,
  PDFAccentBar,
  PDFCategoryBlock,
} from "./pdf-shared-components"
import type { TermsSection } from "@/types/proposal"

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
  /** STANDARD+ gets terms/signature pages */
  includeTerms?: boolean
  /** Structured terms sections (dynamic, user-editable) */
  termsStructured?: TermsSection[]
  /** Contract mode switches language */
  isContract?: boolean
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
  termsStructured,
  isContract = false,
}: ClientEstimatePDFProps) {
  const pdfColors = {
    primary: primaryColor,
    secondary: accentColor,
    accent: accentColor,
    text: colors.gray800,
    background: colors.white,
  }

  const documentLabel = isContract ? "Construction Agreement" : "Project Estimate"
  const acceptanceTitle = isContract
    ? "Acceptance & Authorization to Proceed"
    : "Acceptance & Authorization"

  const s = StyleSheet.create({
    // ─── Cover Page ───
    coverPage: {
      padding: 0,
      backgroundColor: colors.white,
      fontFamily: FONT_FAMILY,
    },
    coverBanner: {
      backgroundColor: primaryColor,
      paddingVertical: 56,
      paddingHorizontal: 60,
    },
    coverLogo: {
      width: 80,
      height: 80,
      objectFit: "contain" as const,
      marginBottom: spacing[4],
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.2)",
      borderRadius: borderRadius.md,
    },
    coverCompany: {
      fontSize: fontSize["8xl"],
      fontWeight: fontWeight.bold,
      color: colors.white,
      marginBottom: 3,
    },
    coverTagline: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.normal,
      color: "rgba(255,255,255,0.75)",
    },

    coverBody: {
      paddingHorizontal: 60,
      paddingTop: spacing[10],
    },
    coverLabel: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 2,
      marginBottom: spacing[2],
    },
    coverTitle: {
      fontSize: fontSize["6xl"],
      fontWeight: fontWeight.bold,
      color: accentColor,
      marginBottom: spacing[8],
    },

    // Metadata grid
    coverMeta: {
      flexDirection: "row" as const,
      gap: spacing[8],
      marginBottom: spacing[10],
    },
    coverMetaBlock: {
      flex: 1,
    },
    coverMetaLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: spacing[1],
    },
    coverMetaValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.medium,
      color: colors.gray700,
    },

    // Total card
    coverTotalCard: {
      backgroundColor: `${primaryColor}08`,
      borderWidth: 1.5,
      borderColor: `${primaryColor}25`,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing[6],
      paddingHorizontal: spacing[8],
      alignItems: "center" as const,
      marginBottom: spacing[10],
    },
    coverTotalLabel: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 2,
      marginBottom: spacing[2],
    },
    coverTotalAmount: {
      fontSize: fontSize["9xl"],
      fontWeight: fontWeight.bold,
      color: primaryColor,
    },

    // Contact footer
    coverContact: {
      position: "absolute" as const,
      bottom: 48,
      left: 60,
      right: 60,
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      borderTopWidth: 1,
      borderTopColor: colors.gray200,
      paddingTop: spacing[4],
    },
    coverContactText: {
      fontSize: fontSize.base,
      color: colors.gray500,
    },

    // ─── Content Pages ───
    page: {
      padding: PAGE_MARGIN,
      paddingBottom: PAGE_MARGIN_BOTTOM,
      fontSize: fontSize.md,
      fontFamily: FONT_FAMILY,
      color: colors.gray700,
    },

    sectionTitle: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: accentColor,
      marginBottom: spacing[4],
      paddingBottom: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.gray200,
    },
    descriptionText: {
      fontSize: fontSize.md,
      lineHeight: lineHeight.relaxed,
      color: colors.gray700,
      marginBottom: spacing[6],
    },

    // ─── Pricing Summary ───
    summaryRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 4,
      paddingHorizontal: spacing[3],
    },
    summaryLabel: {
      fontSize: fontSize.md,
      color: colors.gray500,
    },
    summaryValue: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: colors.gray700,
    },
    summaryDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.gray200,
      marginVertical: spacing[1],
      marginHorizontal: spacing[3],
    },
    grandTotalBar: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      backgroundColor: `${primaryColor}10`,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      borderRadius: borderRadius.md,
      marginTop: spacing[2],
    },
    grandTotalLabel: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: accentColor,
    },
    grandTotalValue: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: primaryColor,
    },

    // ─── Terms ───
    termsItem: {
      marginBottom: spacing[5],
    },
    termsItemHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      marginBottom: spacing[2],
    },
    termsNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: primaryColor,
      alignItems: "center" as const,
      justifyContent: "center" as const,
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
      color: accentColor,
    },
    termsContent: {
      fontSize: fontSize.base,
      lineHeight: lineHeight.relaxed,
      color: colors.gray500,
      paddingLeft: 34, // Align with text after number circle
    },
    termsNotice: {
      backgroundColor: `${primaryColor}08`,
      borderWidth: 1,
      borderColor: `${primaryColor}20`,
      borderRadius: borderRadius.md,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      marginBottom: spacing[6],
    },
    termsNoticeText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: primaryColor,
      textAlign: "center" as const,
    },

    // ─── Signature ───
    sigRow: {
      flexDirection: "row" as const,
      gap: spacing[10],
      marginTop: spacing[10],
    },
    sigColumn: {
      flex: 1,
    },
    sigTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: accentColor,
      marginBottom: spacing[10],
    },
    sigLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.gray700,
      marginBottom: spacing[1],
      height: 30,
    },
    sigLabel: {
      fontSize: fontSize.sm,
      color: colors.gray400,
    },
    contractNotice: {
      backgroundColor: `${accentColor}08`,
      borderWidth: 1.5,
      borderColor: `${accentColor}30`,
      borderRadius: borderRadius.md,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      marginBottom: spacing[6],
    },
    contractNoticeText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: accentColor,
      textAlign: "center" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
    },
  })

  // Clean description for client display
  const cleanDescription = description
    .split("\n\nPROJECT LOCATION:")[0]
    .split("\n\nPERMIT NOTE:")[0]
    .trim()

  // Filter to enabled terms only
  const enabledTerms = (termsStructured || []).filter((t) => t.enabled)

  return (
    <Document>
      {/* ═══ PAGE 1: COVER ═══ */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverBanner}>
          {logoPath && <Image src={logoPath} style={s.coverLogo} />}
          <Text style={s.coverCompany}>{companyName || "Estimate"}</Text>
          {companyTagline && <Text style={s.coverTagline}>{companyTagline}</Text>}
        </View>

        <PDFAccentBar color={accentColor} height={4} marginVertical={0} />

        <View style={s.coverBody}>
          <Text style={s.coverLabel}>{documentLabel}</Text>
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

          <View style={s.coverTotalCard}>
            <Text style={s.coverTotalLabel}>Total Investment</Text>
            <Text style={s.coverTotalAmount}>{formatCurrency(clientTotal)}</Text>
          </View>
        </View>

        <View style={s.coverContact}>
          <Text style={s.coverContactText}>
            {[companyName, companyPhone].filter(Boolean).join("  |  ")}
          </Text>
          <Text style={s.coverContactText}>
            {[companyEmail, companyAddress].filter(Boolean).join("  |  ")}
          </Text>
        </View>
      </Page>

      {/* ═══ PAGE 2: SCOPE & PRICING ═══ */}
      <Page size="A4" style={s.page}>
        <PDFPageHeader
          logoPath={logoPath}
          companyName={companyName}
          pageLabel="Scope & Pricing"
          color={primaryColor}
        />

        {/* Project Overview */}
        <Text style={s.sectionTitle}>Project Overview</Text>
        <Text style={s.descriptionText}>{cleanDescription}</Text>

        {/* Scope of Work */}
        <Text style={s.sectionTitle}>Scope of Work</Text>
        {categories.map((cat) => (
          <PDFCategoryBlock
            key={cat.category}
            category={cat.category}
            narrative={cat.narrative}
            clientTotal={cat.clientTotal}
            itemCount={cat.itemCount}
            c={pdfColors}
          />
        ))}

        {/* Pricing Summary */}
        <View style={{ marginTop: spacing[6], borderTopWidth: 2, borderTopColor: primaryColor, paddingTop: spacing[4] }}>
          <Text style={{ ...s.sectionTitle, borderBottomWidth: 0, marginBottom: spacing[2] }}>
            Investment Summary
          </Text>
          {categories.map((cat) => (
            <View key={cat.category} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{cat.category}</Text>
              <Text style={s.summaryValue}>{formatCurrency(cat.clientTotal)}</Text>
            </View>
          ))}
          <View style={s.summaryDivider} />
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>{formatCurrency(clientSubtotal)}</Text>
          </View>
          {taxAmount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Tax</Text>
              <Text style={s.summaryValue}>{formatCurrency(taxAmount)}</Text>
            </View>
          )}
          <View style={s.grandTotalBar}>
            <Text style={s.grandTotalLabel}>Total Investment</Text>
            <Text style={s.grandTotalValue}>{formatCurrency(clientTotal)}</Text>
          </View>
        </View>

        <PDFPageFooter companyName={companyName} />
      </Page>

      {/* ═══ PAGE 3: TERMS (STANDARD+ only) ═══ */}
      {includeTerms && enabledTerms.length > 0 && (
        <Page size="A4" style={s.page}>
          <PDFPageHeader
            logoPath={logoPath}
            companyName={companyName}
            pageLabel="Terms & Conditions"
            color={primaryColor}
          />

          <Text style={s.sectionTitle}>Terms &amp; Conditions</Text>

          {/* Validity notice */}
          <View style={s.termsNotice}>
            <Text style={s.termsNoticeText}>
              This estimate is valid for 30 days from the date shown above.
            </Text>
          </View>

          {/* Contract preamble */}
          {isContract && (
            <Text style={{ ...s.descriptionText, marginBottom: spacing[5] }}>
              This Construction Agreement (&quot;Agreement&quot;) is entered into between the
              Contractor identified on the cover page and the Client. Both parties agree to the
              scope of work, pricing, and the following terms and conditions.
            </Text>
          )}

          {/* Dynamic terms sections */}
          {enabledTerms.map((section, idx) => (
            <View key={section.id} style={s.termsItem} wrap={false}>
              <View style={s.termsItemHeader}>
                <View style={s.termsNumber}>
                  <Text style={s.termsNumberText}>{idx + 1}</Text>
                </View>
                <Text style={s.termsTitle}>{section.title}</Text>
              </View>
              <Text style={s.termsContent}>{section.content}</Text>
            </View>
          ))}

          <PDFPageFooter companyName={companyName} />
        </Page>
      )}

      {/* ═══ PAGE 4: SIGNATURE (STANDARD+ only) ═══ */}
      {includeTerms && (
        <Page size="A4" style={s.page}>
          <PDFPageHeader
            logoPath={logoPath}
            companyName={companyName}
            pageLabel={isContract ? "Agreement" : "Acceptance"}
            color={primaryColor}
          />

          <Text style={s.sectionTitle}>{acceptanceTitle}</Text>

          {/* Contract notice */}
          {isContract && (
            <View style={s.contractNotice}>
              <Text style={s.contractNoticeText}>
                This is a binding agreement upon execution by both parties
              </Text>
            </View>
          )}

          <Text style={s.descriptionText}>
            {isContract
              ? "By signing below, both parties agree to the scope of work, pricing, and terms outlined in this agreement. This document constitutes a binding contract upon execution."
              : "By signing below, both parties agree to the scope of work, pricing, and terms outlined in this estimate."}
          </Text>

          {/* Estimate reference */}
          <View style={{ flexDirection: "row", gap: spacing[8], marginBottom: spacing[4] }}>
            <View>
              <Text style={{ fontSize: fontSize.sm, color: colors.gray400, marginBottom: 2 }}>
                Reference
              </Text>
              <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.gray700 }}>
                {title}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: fontSize.sm, color: colors.gray400, marginBottom: 2 }}>
                Date
              </Text>
              <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.gray700 }}>
                {createdAt}
              </Text>
            </View>
          </View>

          {/* Agreed total */}
          <View style={s.coverTotalCard}>
            <Text style={s.coverTotalLabel}>Agreed Total</Text>
            <Text style={{ ...s.coverTotalAmount, fontSize: fontSize["7xl"] }}>
              {formatCurrency(clientTotal)}
            </Text>
          </View>

          {/* Signature blocks */}
          <View style={s.sigRow}>
            <View style={s.sigColumn}>
              <Text style={s.sigTitle}>Client</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Signature</Text>
              <View style={{ ...s.sigLine, marginTop: spacing[6] }} />
              <Text style={s.sigLabel}>Printed Name</Text>
              <View style={{ ...s.sigLine, marginTop: spacing[6] }} />
              <Text style={s.sigLabel}>Date</Text>
            </View>

            <View style={s.sigColumn}>
              <Text style={s.sigTitle}>Contractor</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Signature</Text>
              <View style={{ ...s.sigLine, marginTop: spacing[6] }} />
              <Text style={s.sigLabel}>
                {companyName || "Company Representative"}
              </Text>
              <View style={{ ...s.sigLine, marginTop: spacing[6] }} />
              <Text style={s.sigLabel}>Date</Text>
            </View>
          </View>

          <PDFPageFooter companyName={companyName} />
        </Page>
      )}
    </Document>
  )
}
