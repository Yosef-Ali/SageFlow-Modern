import { z } from 'zod'

// Ethiopian phone number format: +251 or 0 followed by 9 or 7 and 8 more digits
const ethiopianPhoneRegex = /^(\+251|0)[97]\d{8}$/

// Ethiopian TIN format: 10 digits
const ethiopianTINRegex = /^\d{10}$/

// Peachtree-standard customer types
export const customerTypes = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'NGO', label: 'NGO / Non-Profit' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'OTHER', label: 'Other' },
] as const

// Peachtree-standard payment terms
export const paymentTerms = [
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt', days: 0 },
  { value: 'NET_15', label: 'Net 15', days: 15 },
  { value: 'NET_30', label: 'Net 30', days: 30 },
  { value: 'NET_45', label: 'Net 45', days: 45 },
  { value: 'NET_60', label: 'Net 60', days: 60 },
  { value: 'NET_90', label: 'Net 90', days: 90 },
  { value: '2_10_NET_30', label: '2% 10 Net 30', days: 30, discountDays: 10, discountPercent: 2 },
  { value: 'COD', label: 'Cash on Delivery', days: 0 },
] as const

// Price levels (Peachtree standard)
export const priceLevels = [
  { value: '1', label: 'Level 1 - Retail' },
  { value: '2', label: 'Level 2 - Wholesale' },
  { value: '3', label: 'Level 3 - Distributor' },
] as const

// Address validation schema
export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
})

// Customer create/update validation schema
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(ethiopianPhoneRegex, 'Invalid Ethiopian phone number format (e.g., +251912345678 or 0912345678)'),
  taxId: z
    .string()
    .max(50, 'Tax ID must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  billingAddress: addressSchema,
  shippingAddress: addressSchema.optional(),
  sameAsBilling: z.boolean().optional(),
  creditLimit: z
    .number()
    .nonnegative('Credit limit must be positive')
    .optional()
    .or(z.nan()),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional().default(true),
  // Peachtree-standard fields
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'GOVERNMENT', 'NGO', 'CORPORATE', 'OTHER']).optional().default('RETAIL'),
  paymentTerms: z.enum(['DUE_ON_RECEIPT', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', '2_10_NET_30', 'COD']).optional().default('NET_30'),
  contactName: z.string().max(100).optional().or(z.literal('')),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  taxExempt: z.boolean().optional().default(false),
  taxExemptNumber: z.string().max(50).optional().or(z.literal('')),
  priceLevel: z.enum(['1', '2', '3']).optional().default('1'),
  salesRepId: z.string().optional(),
  openingBalance: z.number().optional().default(0),
  openingBalanceDate: z.date().optional().or(z.string().optional()),
  customerSince: z.date().optional().or(z.string().optional()),
})

// Type inference from schema
export type CustomerFormValues = z.infer<typeof customerSchema>

// Helper function to calculate due date based on payment terms
export function calculateDueDate(invoiceDate: Date, terms: string): Date {
  const termConfig = paymentTerms.find(t => t.value === terms)
  const daysToAdd = termConfig?.days ?? 30

  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + daysToAdd)
  return dueDate
}

// Helper function to get early payment discount info
export function getEarlyPaymentDiscount(terms: string): { discountPercent: number; discountDays: number } | null {
  const termConfig = paymentTerms.find(t => t.value === terms)
  if (termConfig && 'discountPercent' in termConfig && 'discountDays' in termConfig) {
    return {
      discountPercent: termConfig.discountPercent,
      discountDays: termConfig.discountDays,
    }
  }
  return null
}

// Search/filter validation
export const customerFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'GOVERNMENT', 'NGO', 'CORPORATE', 'OTHER']).optional(),
  sortBy: z.enum(['name', 'customerNumber', 'balance', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
})

export type CustomerFiltersValues = z.infer<typeof customerFiltersSchema>
