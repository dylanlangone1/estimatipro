import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1F2937",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#E94560",
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  categoryRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#F9FAFB",
  },
  colDesc: { flex: 2 },
  colQty: { width: 35, textAlign: "right" },
  colUnit: { width: 30, textAlign: "center" },
  colUnitCost: { width: 55, textAlign: "right" },
  colLabor: { width: 55, textAlign: "right" },
  colMaterial: { width: 55, textAlign: "right" },
  colTotal: { width: 65, textAlign: "right" },
  bold: { fontWeight: "bold" },
  headerText: { fontWeight: "bold", fontSize: 8, color: "#6B7280" },
  totalSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotal: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: "#1A1A2E",
    marginTop: 4,
  },
  grandTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E94560",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9CA3AF",
  },
  notes: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
  },
  noteText: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 2,
  },
})

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

interface EstimatePDFProps {
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
  // Branding (Pro+)
  companyName?: string
  companyLogo?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
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
}: EstimatePDFProps) {
  const grouped = groupByCategory(lineItems)
  const totalLabor = lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0)
  const totalMaterial = lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0)
  const hasLaborData = totalLabor > 0 || totalMaterial > 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {companyName ? (
            <View>
              <Text style={styles.title}>{companyName}</Text>
              {companyPhone && (
                <Text style={styles.subtitle}>{companyPhone}</Text>
              )}
              {companyEmail && (
                <Text style={styles.subtitle}>{companyEmail}</Text>
              )}
              {companyAddress && (
                <Text style={styles.subtitle}>{companyAddress}</Text>
              )}
              <Text style={{ ...styles.subtitle, marginTop: 8 }}>
                Estimate: {title}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Estimate — {createdAt}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Description</Text>
          <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.5 }}>
            {description}
          </Text>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimate Breakdown</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.colDesc, ...styles.headerText }}>
                Description
              </Text>
              <Text style={{ ...styles.colQty, ...styles.headerText }}>
                Qty
              </Text>
              <Text style={{ ...styles.colUnit, ...styles.headerText }}>
                Unit
              </Text>
              <Text style={{ ...styles.colUnitCost, ...styles.headerText }}>
                Unit Cost
              </Text>
              {hasLaborData && (
                <>
                  <Text style={{ ...styles.colLabor, ...styles.headerText }}>
                    Labor
                  </Text>
                  <Text style={{ ...styles.colMaterial, ...styles.headerText }}>
                    Material
                  </Text>
                </>
              )}
              <Text style={{ ...styles.colTotal, ...styles.headerText }}>
                Total
              </Text>
            </View>

            {/* Categories and Items */}
            {Object.entries(grouped).map(([category, items]) => (
              <View key={category}>
                <View style={styles.categoryRow}>
                  <Text style={{ ...styles.bold, fontSize: 10 }}>
                    {category}
                  </Text>
                </View>
                {items.map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.colDesc}>{item.description}</Text>
                    <Text style={styles.colQty}>
                      {item.quantity.toLocaleString()}
                    </Text>
                    <Text style={styles.colUnit}>{item.unit}</Text>
                    <Text style={styles.colUnitCost}>
                      {formatCurrency(item.unitCost)}
                    </Text>
                    {hasLaborData && (
                      <>
                        <Text style={styles.colLabor}>
                          {item.laborCost ? formatCurrency(item.laborCost) : "—"}
                        </Text>
                        <Text style={styles.colMaterial}>
                          {item.materialCost ? formatCurrency(item.materialCost) : "—"}
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
            <Text style={styles.grandTotalText}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>

        {/* Assumptions */}
        {assumptions && assumptions.length > 0 && (
          <View style={styles.notes}>
            <Text style={{ ...styles.bold, fontSize: 9, marginBottom: 4 }}>
              Assumptions:
            </Text>
            {assumptions.map((a, i) => (
              <Text key={i} style={styles.noteText}>
                • {a}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by EstimAI Pro — estimaipro.com
        </Text>
      </Page>
    </Document>
  )
}
