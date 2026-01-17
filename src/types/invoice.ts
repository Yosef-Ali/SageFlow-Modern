import { Invoice as PrismaInvoice, InvoiceItem as PrismaInvoiceItem, InvoiceStatus } from '@prisma/client'

// Re-export status enum
export { InvoiceStatus }

// Full invoice type from Prisma
export type Invoice = PrismaInvoice

// Invoice item type
export type InvoiceItem = PrismaInvoiceItem

// Invoice with items included
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
  customer?: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
}

// Invoice list item (for table display)
export interface InvoiceListItem {
  id: string
  invoiceNumber: string
  date: Date
  dueDate: Date
  total: number
  paidAmount: number
  status: InvoiceStatus
  customer: {
    id: string
    name: string
  }
}

// Status colors for UI
export const invoiceStatusColors: Record<InvoiceStatus, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  SENT: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  PARTIALLY_PAID: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  OVERDUE: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
}

// Status labels
export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}
