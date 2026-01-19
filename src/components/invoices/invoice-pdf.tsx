'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// Register a standard font for better rendering
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

// Styles for the PDF document
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e',
    paddingBottom: 20,
  },
  companyInfo: {
    maxWidth: '50%',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    textAlign: 'right',
  },
  invoiceTitleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },
  statusBadge: {
    marginTop: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionHalf: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 3,
  },
  customerDetails: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  dateValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
  },
  descriptionCol: {
    width: '40%',
  },
  qtyCol: {
    width: '15%',
    textAlign: 'center',
  },
  priceCol: {
    width: '20%',
    textAlign: 'right',
  },
  taxCol: {
    width: '10%',
    textAlign: 'center',
  },
  totalCol: {
    width: '15%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '45%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  totalsLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  totalsValue: {
    fontSize: 9,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 5,
    backgroundColor: '#0f766e',
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  balanceDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 5,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  balanceDueLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
  },
  balanceDueValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
  },
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  thankYou: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 5,
  },
})

// Status badge colors
const statusStyles: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f1f5f9', text: '#475569' },
  SENT: { bg: '#dbeafe', text: '#1d4ed8' },
  PARTIALLY_PAID: { bg: '#fef3c7', text: '#92400e' },
  PAID: { bg: '#dcfce7', text: '#166534' },
  OVERDUE: { bg: '#fee2e2', text: '#dc2626' },
  CANCELLED: { bg: '#f3f4f6', text: '#6b7280' },
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

// Type definitions for the invoice data
export interface InvoicePDFData {
  invoice: {
    id: string
    invoiceNumber: string
    date: Date | string
    dueDate: Date | string
    subtotal: string | number
    taxAmount: string | number
    discountAmount: string | number
    total: string | number
    paidAmount: string | number
    status: string
    notes?: string | null
    terms?: string | null
  }
  items: Array<{
    id: string
    description: string
    quantity: string | number
    unitPrice: string | number
    taxRate: string | number
    total: string | number
    item?: {
      name: string
      sku?: string
    } | null
  }>
  customer: {
    name: string
    email?: string | null
    phone?: string | null
    billingAddress?: unknown
  }
  company: {
    name: string
    email: string
    phone?: string | null
    address?: string | null
    taxId?: string | null
  }
}

// Helper function to format currency
function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `ETB ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Helper function to format date
function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Helper to parse address
function formatAddress(address: unknown): string[] {
  if (!address) return []
  if (typeof address === 'string') {
    return address.split('\n').filter(Boolean)
  }
  if (typeof address === 'object') {
    const addr = address as Record<string, string>
    const lines: string[] = []
    if (addr.street) lines.push(addr.street)
    if (addr.city || addr.state || addr.zip) {
      lines.push([addr.city, addr.state, addr.zip].filter(Boolean).join(', '))
    }
    if (addr.country) lines.push(addr.country)
    return lines
  }
  return []
}

// The PDF Document component
export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const { invoice, items, customer, company } = data
  const statusStyle = statusStyles[invoice.status] || statusStyles.DRAFT

  const subtotal = Number(invoice.subtotal)
  const taxAmount = Number(invoice.taxAmount)
  const discountAmount = Number(invoice.discountAmount)
  const total = Number(invoice.total)
  const paidAmount = Number(invoice.paidAmount)
  const balanceDue = total - paidAmount

  const customerAddress = formatAddress(customer.billingAddress)
  const companyAddressLines = company.address
    ? company.address.split('\n').filter(Boolean)
    : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyDetails}>
              {company.email}
              {company.phone && `\n${company.phone}`}
              {companyAddressLines.map((line, i) => `\n${line}`).join('')}
              {company.taxId && `\nTIN: ${company.taxId}`}
            </Text>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceTitleText}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.bg },
              ]}
            >
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {statusLabels[invoice.status] || invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill To and Dates Section */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerDetails}>
              {customer.email && `${customer.email}`}
              {customer.phone && `\n${customer.phone}`}
              {customerAddress.map((line) => `\n${line}`).join('')}
            </Text>
          </View>
          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Invoice Date:</Text>
              <Text style={styles.dateValue}>{formatDate(invoice.date)}</Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Due Date:</Text>
              <Text style={styles.dateValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descriptionCol]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.priceCol]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeaderCell, styles.taxCol]}>Tax</Text>
            <Text style={[styles.tableHeaderCell, styles.totalCol]}>Total</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <View style={styles.descriptionCol}>
                <Text style={styles.tableCell}>
                  {item.item?.name || item.description}
                </Text>
                {item.item?.sku && (
                  <Text style={[styles.tableCell, { color: '#94a3b8', fontSize: 8 }]}>
                    SKU: {item.item.sku}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.qtyCol]}>
                {Number(item.quantity)}
              </Text>
              <Text style={[styles.tableCell, styles.priceCol]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableCell, styles.taxCol]}>
                {(Number(item.taxRate) * 100).toFixed(0)}%
              </Text>
              <Text style={[styles.tableCell, styles.totalCol]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax (15%)</Text>
            <Text style={styles.totalsValue}>{formatCurrency(taxAmount)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>
                -{formatCurrency(discountAmount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
          </View>
          {paidAmount > 0 && (
            <>
              <View style={[styles.totalsRow, { marginTop: 10 }]}>
                <Text style={styles.totalsLabel}>Paid Amount</Text>
                <Text style={styles.totalsValue}>
                  -{formatCurrency(paidAmount)}
                </Text>
              </View>
              <View style={styles.balanceDue}>
                <Text style={styles.balanceDueLabel}>Balance Due</Text>
                <Text style={styles.balanceDueValue}>
                  {formatCurrency(balanceDue)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <View style={styles.notesSection}>
            {invoice.notes && (
              <>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </>
            )}
            {invoice.terms && (
              <>
                <Text style={[styles.notesTitle, invoice.notes ? { marginTop: 10 } : {}]}>
                  Terms & Conditions
                </Text>
                <Text style={styles.notesText}>{invoice.terms}</Text>
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.thankYou}>Thank you for your business!</Text>
          <Text style={styles.footerText}>
            {company.name} | {company.email}
            {company.phone && ` | ${company.phone}`}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
