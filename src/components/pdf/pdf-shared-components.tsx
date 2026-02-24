/**
 * Reusable PDF Sub-Components
 *
 * Shared across all 4 PDF types for consistent appearance.
 */

import { Text, View, Image } from "@react-pdf/renderer"
import {
  FONT_FAMILY,
  fontSize,
  fontWeight,
  spacing,
  colors,
  borderRadius,
  formatCurrency,
  type PDFColors,
} from "./pdf-design-system"

// ─── Page Header (interior pages) ───

interface PDFPageHeaderProps {
  logoPath?: string
  companyName?: string
  pageLabel: string
  color: string
}

export function PDFPageHeader({ logoPath, companyName, pageLabel, color }: PDFPageHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing[6],
        paddingBottom: spacing[3],
        borderBottomWidth: 2,
        borderBottomColor: color,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
        {logoPath && (
          <Image
            src={logoPath}
            style={{ width: 32, height: 32, objectFit: "contain" as const }}
          />
        )}
        {companyName && (
          <Text
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.gray800,
            }}
          >
            {companyName}
          </Text>
        )}
      </View>
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: colors.gray400,
          textTransform: "uppercase" as const,
          letterSpacing: 1,
        }}
      >
        {pageLabel}
      </Text>
    </View>
  )
}

// ─── Page Footer ───

interface PDFPageFooterProps {
  companyName?: string
  showBranding?: boolean
}

export function PDFPageFooter({ companyName, showBranding = true }: PDFPageFooterProps) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 24,
        left: 48,
        right: 48,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 0.5,
        borderTopColor: colors.gray200,
        paddingTop: spacing[2],
      }}
      fixed
    >
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: fontSize.xs,
          color: colors.gray400,
        }}
      >
        {companyName || ""}
      </Text>
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: fontSize.xs,
          color: colors.gray300,
        }}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}${showBranding ? "  |  EstimAI Pro" : ""}`
        }
      />
    </View>
  )
}

// ─── Accent Bar ───

interface PDFAccentBarProps {
  color: string
  width?: number | string
  height?: number
  marginVertical?: number
}

export function PDFAccentBar({
  color,
  width = "100%",
  height = 3,
  marginVertical = spacing[4],
}: PDFAccentBarProps) {
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: color,
        borderRadius: height / 2,
        marginVertical,
      }}
    />
  )
}

// ─── Totals Block ───

interface PDFTotalsBlockProps {
  subtotal: number
  taxAmount: number
  markupPercent?: number
  markupAmount?: number
  totalAmount: number
  totalLabel?: string
  c: PDFColors
  /** If true, show labor/material breakdown */
  laborTotal?: number
  materialTotal?: number
}

export function PDFTotalsBlock({
  subtotal,
  taxAmount,
  markupPercent = 0,
  markupAmount = 0,
  totalAmount,
  totalLabel = "Total",
  c,
  laborTotal,
  materialTotal,
}: PDFTotalsBlockProps) {
  return (
    <View style={{ marginTop: spacing[5], alignItems: "flex-end" as const }}>
      <View
        style={{
          width: 240,
          padding: spacing[4],
          backgroundColor: colors.gray50,
          borderWidth: 1,
          borderColor: colors.gray200,
          borderRadius: borderRadius.md,
        }}
      >
        {/* Labor / Material breakdown */}
        {laborTotal !== undefined && laborTotal > 0 && (
          <TotalRow label="Total Labor" value={formatCurrency(laborTotal)} c={c} />
        )}
        {materialTotal !== undefined && materialTotal > 0 && (
          <TotalRow label="Total Materials" value={formatCurrency(materialTotal)} c={c} />
        )}

        <TotalRow label="Subtotal" value={formatCurrency(subtotal)} c={c} bold />

        {markupPercent > 0 && (
          <TotalRow label={`Markup (${markupPercent}%)`} value={formatCurrency(markupAmount)} c={c} />
        )}

        {taxAmount > 0 && (
          <TotalRow label="Tax" value={formatCurrency(taxAmount)} c={c} />
        )}

        {/* Grand total */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: spacing[2],
            marginTop: spacing[1],
            borderTopWidth: 2,
            borderTopColor: c.primary,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: fontSize["3xl"],
              fontWeight: fontWeight.bold,
              color: c.secondary,
            }}
          >
            {totalLabel}
          </Text>
          <Text
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: fontSize["3xl"],
              fontWeight: fontWeight.bold,
              color: c.primary,
            }}
          >
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Helper: Single Total Row ───

function TotalRow({
  label,
  value,
  c,
  bold = false,
}: {
  label: string
  value: string
  c: PDFColors
  bold?: boolean
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: fontSize.md,
          color: colors.gray500,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: fontSize.md,
          fontWeight: bold ? fontWeight.semibold : fontWeight.normal,
          color: c.text,
        }}
      >
        {value}
      </Text>
    </View>
  )
}

// ─── Section Title ───

interface PDFSectionTitleProps {
  title: string
  color: string
}

export function PDFSectionTitle({ title, color }: PDFSectionTitleProps) {
  return (
    <Text
      style={{
        fontFamily: FONT_FAMILY,
        fontSize: fontSize["2xl"],
        fontWeight: fontWeight.bold,
        color,
        marginBottom: spacing[4],
        paddingBottom: spacing[2],
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
      }}
    >
      {title}
    </Text>
  )
}

// ─── Category Block (for client-facing scope views) ───

interface PDFCategoryBlockProps {
  category: string
  narrative: string
  clientTotal: number
  itemCount: number
  c: PDFColors
}

export function PDFCategoryBlock({ category, narrative, clientTotal, itemCount, c }: PDFCategoryBlockProps) {
  return (
    <View style={{ marginBottom: spacing[5] }} wrap={false}>
      {/* Category header with accent bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing[2],
        }}
      >
        <View
          style={{
            width: 3,
            height: 24,
            backgroundColor: c.primary,
            borderRadius: 1.5,
            marginRight: spacing[3],
          }}
        />
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <Text
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: fontSize.xl,
                fontWeight: fontWeight.semibold,
                color: c.secondary,
              }}
            >
              {category}
            </Text>
            {/* Item count pill */}
            <View
              style={{
                backgroundColor: `${c.primary}15`,
                borderRadius: 10,
                paddingHorizontal: spacing[2],
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.medium,
                  color: c.primary,
                }}
              >
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold,
              color: c.primary,
            }}
          >
            {formatCurrency(clientTotal)}
          </Text>
        </View>
      </View>

      {/* Narrative */}
      {narrative ? (
        <Text
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: fontSize.md,
            lineHeight: 1.7,
            color: colors.gray500,
            paddingLeft: spacing[4],
          }}
        >
          {narrative}
        </Text>
      ) : (
        <Text
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: fontSize.md,
            lineHeight: 1.7,
            color: colors.gray400,
            paddingLeft: spacing[4],
            fontStyle: "italic" as const,
          }}
        >
          Includes {itemCount} item{itemCount !== 1 ? "s" : ""} — materials, labor, and installation.
        </Text>
      )}
    </View>
  )
}
