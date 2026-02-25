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
  withAlpha,
  type PDFLineItem,
} from "./pdf-design-system"
import {
  PDFPageHeader,
  PDFPageFooter,
  PDFTotalsBlock,
} from "./pdf-shared-components"
import type { TemplateConfig, ProposalData, TermsSection } from "@/types/proposal"

// ─── Props Interface ───

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
  // Premium MAX-tier props
  projectPhotoUrl?: string
  showLogoWatermark?: boolean
  invoiceNumber?: string
  invoiceDueDate?: string
  bankName?: string
  bankRouting?: string
  bankAccount?: string
  stripePaymentLink?: string
}

// ─── Watermark (text-based — react-pdf cannot apply opacity to Image) ───

function ProposalWatermark({ text, color }: { text: string; color: string }) {
  return (
    <View
      style={{
        position: "absolute",
        top: "30%",
        left: 0,
        right: 0,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 64,
          fontWeight: fontWeight.bold,
          color: withAlpha(color, 0.05),
          transform: "rotate(-45deg)",
          letterSpacing: 8,
          textTransform: "uppercase" as const,
        }}
      >
        {text}
      </Text>
    </View>
  )
}

// ─── Main Component ───

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
  projectPhotoUrl,
  showLogoWatermark = false,
  invoiceNumber,
  invoiceDueDate,
  bankName,
  bankRouting,
  bankAccount,
  stripePaymentLink,
}: ProposalPDFProps) {
  const { colors: tc, body, totals, footer } = templateConfig
  const grouped = groupByCategory(lineItems)
  const fontFamily = body.fontFamily === "Helvetica" ? FONT_FAMILY : (body.fontFamily || FONT_FAMILY)
  const enabledTerms = (termsStructured || []).filter((t) => t.enabled)
  const hasProjectOverview = Boolean(proposalData.projectOverview?.trim())

  // Labor / material totals for investment page
  const laborTotal = lineItems.reduce((sum, i) => sum + (i.laborCost ?? 0), 0)
  const materialTotal = lineItems.reduce((sum, i) => sum + (i.materialCost ?? 0), 0)

  // Payment schedule
  const depositAmount = totalAmount * 0.3
  const progressAmount = totalAmount * 0.4
  const finalAmount = totalAmount * 0.3

  // Category totals for breakdown
  const categoryTotals = Object.entries(grouped).map(([cat, items]) => ({
    category: cat,
    total: items.reduce((sum, i) => sum + i.totalCost, 0),
  }))

  // PDFColors shape expected by PDFTotalsBlock
  const pdfColors = {
    primary: tc.primary,
    secondary: tc.secondary || tc.text,
    accent: tc.accent,
    text: tc.text,
    background: tc.background,
  }

  const s = StyleSheet.create({
    // ─── Content Pages ───
    page: {
      padding: PAGE_MARGIN,
      paddingBottom: PAGE_MARGIN_BOTTOM,
      fontSize: fontSize.md,
      fontFamily,
      color: tc.text,
      backgroundColor: tc.background,
    },
    coverPage: {
      padding: 0,
      fontFamily,
      backgroundColor: tc.primary,
    },

    // ─── Typography ───
    pageTitle: {
      fontSize: fontSize["4xl"],
      fontWeight: fontWeight.bold,
      color: tc.primary,
      marginBottom: spacing[4],
      paddingBottom: spacing[2],
      borderBottomWidth: 2,
      borderBottomColor: tc.primary,
    },
    sectionTitle: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.semibold,
      color: tc.secondary || tc.text,
      marginBottom: spacing[3],
      marginTop: spacing[5],
    },
    bodyText: {
      fontSize: fontSize.md,
      color: tc.text,
      lineHeight: lineHeight.relaxed,
      marginBottom: spacing[3],
    },
    muted: { color: colors.gray500 },
    bold: { fontWeight: fontWeight.semibold },

    // ─── About Us ───
    aboutContainer: {
      flexDirection: "row",
      gap: spacing[6],
    },
    aboutCard: {
      width: "32%",
      backgroundColor: withAlpha(tc.primary, 0.05),
      borderRadius: borderRadius.md,
      padding: spacing[4],
      borderLeftWidth: 3,
      borderLeftColor: tc.primary,
    },
    cardLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: spacing[1],
    },
    cardValue: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: tc.text,
      marginBottom: spacing[3],
    },
    aboutNarrative: { flex: 1 },

    // ─── Project Overview Highlights ───
    highlightGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing[3],
      marginTop: spacing[4],
    },
    highlightItem: {
      width: "30%",
      backgroundColor: withAlpha(tc.primary, 0.05),
      borderRadius: borderRadius.base,
      padding: spacing[3],
      borderTopWidth: 2,
      borderTopColor: tc.primary,
    },
    highlightLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: spacing[1],
    },
    highlightValue: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: tc.text,
    },

    // ─── Scope of Work ───
    scopeBlock: {
      marginBottom: spacing[5],
      paddingLeft: spacing[4],
      borderLeftWidth: 3,
      borderLeftColor: tc.primary,
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
      backgroundColor: withAlpha(tc.primary, 0.08),
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1.5,
      borderBottomColor: withAlpha(tc.primary, 0.20),
    },
    tableHeaderText: {
      fontWeight: fontWeight.medium,
      fontSize: fontSize.sm,
      color: tc.primary,
      textTransform: "uppercase" as const,
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
      backgroundColor: body.alternateRowBg ? withAlpha(tc.primary, 0.04) : "transparent",
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: withAlpha(tc.primary, 0.06),
      borderLeftWidth: 3,
      borderLeftColor: tc.primary,
    },
    colDesc: { flex: 3 },
    colQty: { width: 45, textAlign: "right" as const },
    colUnit: { width: 38, textAlign: "center" as const },
    colUnitCost: { width: 65, textAlign: "right" as const },
    colTotal: { width: 75, textAlign: "right" as const },

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

    // ─── Investment Summary ───
    investmentGrid: {
      flexDirection: "row",
      gap: spacing[3],
      marginBottom: spacing[5],
    },
    investmentCard: {
      flex: 1,
      backgroundColor: withAlpha(tc.primary, 0.05),
      borderRadius: borderRadius.md,
      padding: spacing[4],
      borderTopWidth: 3,
      borderTopColor: tc.primary,
    },
    investmentLabel: {
      fontSize: fontSize.sm,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: spacing[1],
    },
    investmentAmount: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.bold,
      color: tc.primary,
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      borderBottomWidth: 0.5,
      borderBottomColor: colors.gray200,
    },
    paymentPhase: { flex: 1 },
    paymentPhaseName: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: tc.text,
    },
    paymentPhaseDesc: {
      fontSize: fontSize.base,
      color: colors.gray400,
    },
    paymentAmount: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: tc.primary,
      alignSelf: "center",
    },

    // ─── Terms ───
    termsItem: { marginBottom: spacing[5] },
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

    // ─── Invoice ───
    invoiceHeaderBar: {
      backgroundColor: tc.primary,
      paddingVertical: spacing[5],
      paddingHorizontal: spacing[6],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[5],
      marginLeft: -PAGE_MARGIN,
      marginRight: -PAGE_MARGIN,
      marginTop: -PAGE_MARGIN,
    },
    invoiceTitle: {
      fontSize: fontSize["5xl"],
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    invoiceMetaGrid: {
      flexDirection: "row",
      gap: spacing[4],
      marginBottom: spacing[4],
      padding: spacing[4],
      backgroundColor: withAlpha(tc.primary, 0.05),
      borderRadius: borderRadius.md,
    },
    invoiceMetaItem: { flex: 1 },
    invoiceMetaLabel: {
      fontSize: fontSize.sm,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: spacing[1],
    },
    invoiceMetaValue: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: tc.text,
    },
    billGrid: {
      flexDirection: "row",
      gap: spacing[6],
      marginBottom: spacing[4],
    },
    billBlock: { flex: 1 },
    billLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.gray400,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.gray200,
      paddingBottom: spacing[1],
    },
    billName: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: tc.text,
      marginBottom: spacing[1],
    },
    billText: {
      fontSize: fontSize.base,
      color: colors.gray500,
      marginBottom: 2,
    },
    totalDueBox: {
      backgroundColor: withAlpha(tc.primary, 0.06),
      borderWidth: 1.5,
      borderColor: withAlpha(tc.primary, 0.20),
      borderRadius: borderRadius.lg,
      paddingVertical: spacing[5],
      paddingHorizontal: spacing[6],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[4],
    },
    totalDueLabel: {
      fontSize: fontSize["2xl"],
      fontWeight: fontWeight.semibold,
      color: tc.secondary || tc.text,
    },
    totalDueAmount: {
      fontSize: fontSize["6xl"],
      fontWeight: fontWeight.bold,
      color: tc.primary,
    },
    paymentMethodsGrid: {
      flexDirection: "row",
      gap: spacing[4],
      marginBottom: spacing[5],
    },
    paymentMethodCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.gray200,
      borderRadius: borderRadius.md,
      padding: spacing[4],
    },
    paymentMethodTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: tc.primary,
      marginBottom: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(tc.primary, 0.15),
      paddingBottom: spacing[2],
    },
    paymentMethodRow: {
      flexDirection: "row",
      marginBottom: spacing[2],
    },
    paymentMethodLabel: {
      fontSize: fontSize.base,
      color: colors.gray400,
      width: 72,
    },
    paymentMethodValue: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: tc.text,
      flex: 1,
    },

    // ─── Signatures ───
    sigContainer: {
      marginTop: spacing[6],
      flexDirection: "row",
      gap: spacing[10],
    },
    sigColumn: { flex: 1 },
    sigLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.gray400,
      marginTop: spacing[8],
      marginBottom: spacing[1],
    },
    sigLabel: {
      fontSize: fontSize.base,
      color: colors.gray400,
    },
  })

  return (
    <Document>

      {/* ═══════════════════════════════════
          PAGE 1 — COVER
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.coverPage}>
        {/* Full-bleed project photo background */}
        {projectPhotoUrl && (
          <Image
            src={projectPhotoUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover" as const,
            }}
          />
        )}

        {/* Dark overlay — always shown (stronger when photo present) */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: projectPhotoUrl
              ? withAlpha(colors.black, 0.62)
              : withAlpha(tc.primary, 0.92),
          }}
        />

        {/* Cover content — three zones: top / centre / bottom */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: 60,
            justifyContent: "space-between",
          }}
        >
          {/* Zone 1 — Company brand */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            {logoPath && (
              <Image
                src={logoPath}
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "contain" as const,
                }}
              />
            )}
            <View>
              <Text
                style={{
                  fontFamily,
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.white,
                }}
              >
                {companyName || ""}
              </Text>
              {companyTagline && (
                <Text
                  style={{
                    fontFamily,
                    fontSize: fontSize.base,
                    color: withAlpha(colors.white, 0.70),
                  }}
                >
                  {companyTagline}
                </Text>
              )}
            </View>
          </View>

          {/* Zone 2 — Project identity */}
          <View style={{ alignItems: "center" }}>
            {/* FINAL PROPOSAL badge */}
            <View
              style={{
                backgroundColor: tc.accent || withAlpha(colors.white, 0.20),
                paddingHorizontal: spacing[5],
                paddingVertical: spacing[2],
                borderRadius: borderRadius.sm,
                marginBottom: spacing[4],
              }}
            >
              <Text
                style={{
                  fontFamily,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.bold,
                  color: colors.white,
                  letterSpacing: 3,
                  textTransform: "uppercase" as const,
                }}
              >
                {isContract ? "CONSTRUCTION AGREEMENT" : "FINAL PROPOSAL"}
              </Text>
            </View>

            {/* Project title */}
            <Text
              style={{
                fontFamily,
                fontSize: fontSize["7xl"],
                fontWeight: fontWeight.bold,
                color: colors.white,
                textAlign: "center",
                marginBottom: spacing[3],
                lineHeight: lineHeight.tight,
              }}
            >
              {title}
            </Text>

            {clientName && (
              <Text
                style={{
                  fontFamily,
                  fontSize: fontSize["2xl"],
                  color: withAlpha(colors.white, 0.78),
                  textAlign: "center",
                  marginBottom: spacing[2],
                }}
              >
                Prepared for {clientName}
              </Text>
            )}

            <Text
              style={{
                fontFamily,
                fontSize: fontSize.lg,
                color: withAlpha(colors.white, 0.60),
              }}
            >
              {createdAt}
            </Text>
          </View>

          {/* Zone 3 — Investment summary + contacts */}
          <View>
            {/* Total investment card */}
            <View
              style={{
                backgroundColor: withAlpha(colors.white, 0.15),
                borderWidth: 1,
                borderColor: withAlpha(colors.white, 0.28),
                borderRadius: borderRadius.lg,
                paddingVertical: spacing[5],
                paddingHorizontal: spacing[8],
                alignItems: "center",
                marginBottom: spacing[5],
              }}
            >
              <Text
                style={{
                  fontFamily,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.medium,
                  color: withAlpha(colors.white, 0.65),
                  textTransform: "uppercase" as const,
                  letterSpacing: 2,
                  marginBottom: spacing[2],
                }}
              >
                Total Investment
              </Text>
              <Text
                style={{
                  fontFamily,
                  fontSize: fontSize["9xl"],
                  fontWeight: fontWeight.bold,
                  color: colors.white,
                }}
              >
                {formatCurrency(totalAmount)}
              </Text>
            </View>

            {/* Contact strip */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: spacing[3],
                borderTopWidth: 1,
                borderTopColor: withAlpha(colors.white, 0.22),
                paddingTop: spacing[4],
              }}
            >
              {companyPhone && (
                <Text style={{ fontFamily, fontSize: fontSize.base, color: withAlpha(colors.white, 0.68) }}>
                  {companyPhone}
                </Text>
              )}
              {companyPhone && companyEmail && (
                <Text style={{ fontFamily, fontSize: fontSize.base, color: withAlpha(colors.white, 0.35) }}>
                  |
                </Text>
              )}
              {companyEmail && (
                <Text style={{ fontFamily, fontSize: fontSize.base, color: withAlpha(colors.white, 0.68) }}>
                  {companyEmail}
                </Text>
              )}
              {companyEmail && companyAddress && (
                <Text style={{ fontFamily, fontSize: fontSize.base, color: withAlpha(colors.white, 0.35) }}>
                  |
                </Text>
              )}
              {companyAddress && (
                <Text style={{ fontFamily, fontSize: fontSize.base, color: withAlpha(colors.white, 0.68) }}>
                  {companyAddress}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════
          PAGE 2 — ABOUT US
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {showLogoWatermark && companyName && (
          <ProposalWatermark text={companyName} color={tc.primary} />
        )}
        <PDFPageHeader
          logoPath={logoPath}
          companyName={companyName}
          pageLabel="About Us"
          color={tc.primary}
        />
        <Text style={s.pageTitle}>About Us</Text>

        <View style={s.aboutContainer}>
          {/* Company info card */}
          <View style={s.aboutCard}>
            {logoPath && (
              <Image
                src={logoPath}
                style={{
                  width: 48,
                  height: 48,
                  objectFit: "contain" as const,
                  marginBottom: spacing[3],
                }}
              />
            )}
            <Text style={s.cardLabel}>Company</Text>
            <Text style={s.cardValue}>{companyName || "Our Company"}</Text>
            {companyPhone && (
              <>
                <Text style={s.cardLabel}>Phone</Text>
                <Text style={{ ...s.cardValue, fontSize: fontSize.base }}>{companyPhone}</Text>
              </>
            )}
            {companyEmail && (
              <>
                <Text style={s.cardLabel}>Email</Text>
                <Text style={{ ...s.cardValue, fontSize: fontSize.base }}>{companyEmail}</Text>
              </>
            )}
            {companyAddress && (
              <>
                <Text style={s.cardLabel}>Address</Text>
                <Text style={{ ...s.cardValue, fontSize: fontSize.base }}>{companyAddress}</Text>
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

      {/* ═══════════════════════════════════
          PAGE 3 — PROJECT OVERVIEW (conditional)
      ═══════════════════════════════════ */}
      {hasProjectOverview && (
        <Page size="A4" style={s.page}>
          {showLogoWatermark && companyName && (
            <ProposalWatermark text={companyName} color={tc.primary} />
          )}
          <PDFPageHeader
            logoPath={logoPath}
            companyName={companyName}
            pageLabel="Project Overview"
            color={tc.primary}
          />
          <Text style={s.pageTitle}>Project Overview</Text>
          <Text style={s.bodyText}>{proposalData.projectOverview}</Text>

          {/* Key highlights grid */}
          <View style={s.highlightGrid}>
            <View style={s.highlightItem} wrap={false}>
              <Text style={s.highlightLabel}>Project</Text>
              <Text style={s.highlightValue}>{title}</Text>
            </View>
            {clientName && (
              <View style={s.highlightItem} wrap={false}>
                <Text style={s.highlightLabel}>Client</Text>
                <Text style={s.highlightValue}>{clientName}</Text>
              </View>
            )}
            <View style={s.highlightItem} wrap={false}>
              <Text style={s.highlightLabel}>Total Investment</Text>
              <Text style={s.highlightValue}>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={s.highlightItem} wrap={false}>
              <Text style={s.highlightLabel}>Date</Text>
              <Text style={s.highlightValue}>{createdAt}</Text>
            </View>
            <View style={s.highlightItem} wrap={false}>
              <Text style={s.highlightLabel}>Line Items</Text>
              <Text style={s.highlightValue}>{lineItems.length} items</Text>
            </View>
            <View style={s.highlightItem} wrap={false}>
              <Text style={s.highlightLabel}>Categories</Text>
              <Text style={s.highlightValue}>{Object.keys(grouped).length}</Text>
            </View>
          </View>

          <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
        </Page>
      )}

      {/* ═══════════════════════════════════
          PAGE 4 — SCOPE OF WORK
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {showLogoWatermark && companyName && (
          <ProposalWatermark text={companyName} color={tc.primary} />
        )}
        <PDFPageHeader
          logoPath={logoPath}
          companyName={companyName}
          pageLabel="Scope of Work"
          color={tc.primary}
        />
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

      {/* ═══════════════════════════════════
          PAGES 5–6 — DETAILED ESTIMATE (wraps naturally)
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {showLogoWatermark && companyName && (
          <ProposalWatermark text={companyName} color={tc.primary} />
        )}
        <PDFPageHeader
          logoPath={logoPath}
          companyName={companyName}
          pageLabel="Detailed Estimate"
          color={tc.primary}
        />
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
                <Text
                  style={{
                    fontWeight: fontWeight.semibold,
                    fontSize: fontSize.md,
                    color: tc.primary,
                  }}
                >
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
                  wrap={false}
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

        {/* Totals block */}
        <PDFTotalsBlock
          subtotal={subtotal}
          markupPercent={markupPercent}
          markupAmount={markupAmount}
          taxAmount={taxAmount}
          totalAmount={totalAmount}
          c={pdfColors}
          laborTotal={laborTotal > 0 ? laborTotal : undefined}
          materialTotal={materialTotal > 0 ? materialTotal : undefined}
        />

        {/* Assumptions */}
        {assumptions && assumptions.length > 0 && (
          <View
            style={{
              marginTop: spacing[5],
              padding: spacing[3],
              backgroundColor: withAlpha(tc.accent, 0.06),
              borderRadius: borderRadius.base,
              borderLeftWidth: 3,
              borderLeftColor: tc.accent,
            }}
            wrap={false}
          >
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: tc.secondary || tc.text,
                marginBottom: spacing[1],
              }}
            >
              Assumptions &amp; Inclusions
            </Text>
            {assumptions.map((a, i) => (
              <Text
                key={i}
                style={{ fontSize: fontSize.base, color: colors.gray500, marginBottom: 2 }}
              >
                {"\u2022"} {a}
              </Text>
            ))}
          </View>
        )}

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══════════════════════════════════
          PAGE 7 — PROJECT TIMELINE
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {showLogoWatermark && companyName && (
          <ProposalWatermark text={companyName} color={tc.primary} />
        )}
        <PDFPageHeader
          logoPath={logoPath}
          companyName={companyName}
          pageLabel="Project Timeline"
          color={tc.primary}
        />
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

      {/* ═══════════════════════════════════
          PAGE 8 — INVESTMENT & PAYMENT SCHEDULE
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {showLogoWatermark && companyName && (
          <ProposalWatermark text={companyName} color={tc.primary} />
        )}
        <PDFPageHeader
          logoPath={logoPath}
          companyName={companyName}
          pageLabel="Investment Summary"
          color={tc.primary}
        />
        <Text style={s.pageTitle}>Investment &amp; Payment Schedule</Text>

        {proposalData.investmentSummary && (
          <Text style={s.bodyText}>{proposalData.investmentSummary}</Text>
        )}

        {/* Summary cards */}
        <View style={s.investmentGrid}>
          <View style={s.investmentCard} wrap={false}>
            <Text style={s.investmentLabel}>Subtotal</Text>
            <Text style={s.investmentAmount}>{formatCurrency(subtotal)}</Text>
          </View>
          {markupAmount > 0 && (
            <View style={s.investmentCard} wrap={false}>
              <Text style={s.investmentLabel}>Markup ({markupPercent}%)</Text>
              <Text style={s.investmentAmount}>{formatCurrency(markupAmount)}</Text>
            </View>
          )}
          {taxAmount > 0 && (
            <View style={s.investmentCard} wrap={false}>
              <Text style={s.investmentLabel}>Tax</Text>
              <Text style={s.investmentAmount}>{formatCurrency(taxAmount)}</Text>
            </View>
          )}
          <View
            style={{
              ...s.investmentCard,
              backgroundColor: withAlpha(tc.primary, 0.10),
            }}
            wrap={false}
          >
            <Text style={s.investmentLabel}>Project Total</Text>
            <Text style={{ ...s.investmentAmount, fontSize: fontSize["3xl"] }}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>

        {/* Cost breakdown by category */}
        {categoryTotals.length > 0 && (
          <View style={{ marginBottom: spacing[5] }}>
            <Text style={s.sectionTitle}>Cost Breakdown by Category</Text>
            {categoryTotals.map((cat, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: spacing[2],
                  paddingHorizontal: spacing[3],
                  backgroundColor: i % 2 === 0 ? withAlpha(tc.primary, 0.03) : "transparent",
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.gray200,
                }}
              >
                <Text style={{ fontSize: fontSize.md, color: tc.text }}>{cat.category}</Text>
                <Text
                  style={{
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.semibold,
                    color: tc.primary,
                  }}
                >
                  {formatCurrency(cat.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment schedule */}
        <Text style={s.sectionTitle}>Suggested Payment Schedule</Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.gray200,
            borderRadius: borderRadius.md,
            overflow: "hidden",
          }}
        >
          <View style={s.paymentRow} wrap={false}>
            <View style={s.paymentPhase}>
              <Text style={s.paymentPhaseName}>Deposit — 30%</Text>
              <Text style={s.paymentPhaseDesc}>Due upon contract signing</Text>
            </View>
            <Text style={s.paymentAmount}>{formatCurrency(depositAmount)}</Text>
          </View>
          <View
            style={{ ...s.paymentRow, backgroundColor: withAlpha(tc.primary, 0.03) }}
            wrap={false}
          >
            <View style={s.paymentPhase}>
              <Text style={s.paymentPhaseName}>Progress Payment — 40%</Text>
              <Text style={s.paymentPhaseDesc}>Due at project midpoint</Text>
            </View>
            <Text style={s.paymentAmount}>{formatCurrency(progressAmount)}</Text>
          </View>
          <View style={s.paymentRow} wrap={false}>
            <View style={s.paymentPhase}>
              <Text style={s.paymentPhaseName}>Final Payment — 30%</Text>
              <Text style={s.paymentPhaseDesc}>Due upon project completion</Text>
            </View>
            <Text style={s.paymentAmount}>{formatCurrency(finalAmount)}</Text>
          </View>
        </View>

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══════════════════════════════════
          PAGE 9 — TERMS, WARRANTY & EXCLUSIONS
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {showLogoWatermark && companyName && (
          <ProposalWatermark text={companyName} color={tc.primary} />
        )}
        <PDFPageHeader
          logoPath={logoPath}
          companyName={companyName}
          pageLabel="Terms & Conditions"
          color={tc.primary}
        />
        <Text style={s.pageTitle}>Terms, Warranty &amp; Exclusions</Text>

        {/* Contract preamble */}
        {isContract && (
          <View
            style={{
              backgroundColor: withAlpha(tc.primary, 0.06),
              borderWidth: 1,
              borderColor: withAlpha(tc.primary, 0.20),
              borderRadius: borderRadius.md,
              padding: spacing[4],
              marginBottom: spacing[5],
            }}
          >
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: tc.primary,
                textAlign: "center",
                textTransform: "uppercase" as const,
                letterSpacing: 1,
              }}
            >
              This is a binding agreement upon execution by both parties
            </Text>
          </View>
        )}

        {/* Structured terms */}
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
          <Text style={{ ...s.bodyText, ...s.muted }}>{proposalData.terms}</Text>
        )}

        {/* Warranty */}
        {proposalData.warranty && (
          <View style={{ marginTop: spacing[5] }}>
            <Text style={s.sectionTitle}>Warranty</Text>
            <Text style={{ ...s.bodyText, ...s.muted }}>{proposalData.warranty}</Text>
          </View>
        )}

        {/* Exclusions */}
        {proposalData.exclusions && (
          <View style={{ marginTop: spacing[4] }}>
            <Text style={s.sectionTitle}>Exclusions</Text>
            <Text style={{ ...s.bodyText, ...s.muted }}>{proposalData.exclusions}</Text>
          </View>
        )}

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

      {/* ═══════════════════════════════════
          PAGE 10 — INVOICE & SIGNATURE
      ═══════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        {showLogoWatermark && companyName && (
          <ProposalWatermark text={companyName} color={tc.primary} />
        )}

        {/* Invoice header bar — bleeds to page edges */}
        <View style={s.invoiceHeaderBar}>
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            {invoiceNumber && (
              <Text
                style={{
                  fontFamily,
                  fontSize: fontSize.lg,
                  color: withAlpha(colors.white, 0.75),
                  marginTop: spacing[1],
                }}
              >
                {invoiceNumber}
              </Text>
            )}
          </View>
          {logoPath && (
            <Image
              src={logoPath}
              style={{
                width: 50,
                height: 50,
                objectFit: "contain" as const,
              }}
            />
          )}
        </View>

        {/* Invoice meta: #, issued, due */}
        <View style={s.invoiceMetaGrid}>
          <View style={s.invoiceMetaItem}>
            <Text style={s.invoiceMetaLabel}>Invoice #</Text>
            <Text style={s.invoiceMetaValue}>{invoiceNumber || "INV-001"}</Text>
          </View>
          <View style={s.invoiceMetaItem}>
            <Text style={s.invoiceMetaLabel}>Issued</Text>
            <Text style={s.invoiceMetaValue}>{createdAt}</Text>
          </View>
          <View style={s.invoiceMetaItem}>
            <Text style={s.invoiceMetaLabel}>Due Date</Text>
            <Text style={s.invoiceMetaValue}>{invoiceDueDate || "Upon Completion"}</Text>
          </View>
        </View>

        {/* Bill To / From */}
        <View style={s.billGrid}>
          <View style={s.billBlock}>
            <Text style={s.billLabel}>Bill To</Text>
            <Text style={s.billName}>{clientName || "Client"}</Text>
          </View>
          <View style={s.billBlock}>
            <Text style={s.billLabel}>From</Text>
            <Text style={s.billName}>{companyName || "Contractor"}</Text>
            {companyPhone && <Text style={s.billText}>{companyPhone}</Text>}
            {companyEmail && <Text style={s.billText}>{companyEmail}</Text>}
            {companyAddress && <Text style={s.billText}>{companyAddress}</Text>}
          </View>
        </View>

        {/* Total Amount Due */}
        <View style={s.totalDueBox}>
          <Text style={s.totalDueLabel}>Amount Due</Text>
          <Text style={s.totalDueAmount}>{formatCurrency(totalAmount)}</Text>
        </View>

        {/* Payment methods — only if configured */}
        {(stripePaymentLink || bankName) && (
          <View style={s.paymentMethodsGrid}>
            {stripePaymentLink && (
              <View style={s.paymentMethodCard}>
                <Text style={s.paymentMethodTitle}>Pay Online</Text>
                <View style={s.paymentMethodRow}>
                  <Text style={s.paymentMethodLabel}>Link:</Text>
                  <Text
                    style={{
                      ...s.paymentMethodValue,
                      fontSize: fontSize.xs,
                      color: tc.primary,
                    }}
                  >
                    {stripePaymentLink}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: fontSize.xs,
                    color: colors.gray400,
                    marginTop: spacing[2],
                    lineHeight: lineHeight.relaxed,
                  }}
                >
                  Secure payment powered by Stripe. All major credit cards accepted.
                </Text>
              </View>
            )}
            {bankName && (
              <View style={s.paymentMethodCard}>
                <Text style={s.paymentMethodTitle}>Wire Transfer</Text>
                <View style={s.paymentMethodRow}>
                  <Text style={s.paymentMethodLabel}>Bank:</Text>
                  <Text style={s.paymentMethodValue}>{bankName}</Text>
                </View>
                {bankRouting && (
                  <View style={s.paymentMethodRow}>
                    <Text style={s.paymentMethodLabel}>Routing:</Text>
                    <Text style={s.paymentMethodValue}>{bankRouting}</Text>
                  </View>
                )}
                {bankAccount && (
                  <View style={s.paymentMethodRow}>
                    <Text style={s.paymentMethodLabel}>Account:</Text>
                    <Text style={s.paymentMethodValue}>{bankAccount}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

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

        <PDFPageFooter companyName={companyName} showBranding={footer.showGeneratedBy} />
      </Page>

    </Document>
  )
}
