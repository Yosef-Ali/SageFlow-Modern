import { z } from "zod"

// Payment methods available in Ethiopian market
export const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'chapa', label: 'Chapa (Mobile Money)' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
] as const

export type PaymentMethod = typeof paymentMethods[number]['value']

// Payment form schema
export const paymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  invoiceId: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.date({ required_error: "Payment date is required" }),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// Payment filters schema
export const paymentFiltersSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  invoiceId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  paymentMethod: z.string().optional(),
  sortBy: z.enum(["paymentDate", "amount", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// Type exports
export type PaymentFormValues = z.infer<typeof paymentSchema>
export type PaymentFiltersValues = z.infer<typeof paymentFiltersSchema>
