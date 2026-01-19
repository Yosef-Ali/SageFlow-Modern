import type { Payment as DrizzlePayment } from '@/db/schema'
import { paymentMethods } from '@/lib/validations/payment'

// Full payment type from Drizzle
export type Payment = DrizzlePayment

// Payment with related data
export interface PaymentWithDetails extends Payment {
  customer: {
    id: string
    name: string
  }
  invoice?: {
    id: string
    invoiceNumber: string
    total: string | number
  } | null
}

// Payment list item for table display
export interface PaymentListItem {
  id: string
  amount: number
  paymentDate: Date
  paymentMethod: string
  reference: string | null
  customer: {
    id: string
    name: string
  }
  invoice?: {
    id: string
    invoiceNumber: string
  } | null
}

// Payment method labels
export function getPaymentMethodLabel(method: string): string {
  const found = paymentMethods.find(m => m.value === method)
  return found?.label || method
}

// Payment method colors for badges
export const paymentMethodColors: Record<string, { bg: string; text: string }> = {
  cash: { bg: 'bg-green-100', text: 'text-green-700' },
  bank_transfer: { bg: 'bg-blue-100', text: 'text-blue-700' },
  chapa: { bg: 'bg-purple-100', text: 'text-purple-700' },
  check: { bg: 'bg-amber-100', text: 'text-amber-700' },
  credit_card: { bg: 'bg-slate-100', text: 'text-slate-700' },
}
