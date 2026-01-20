import { z } from 'zod'

// Ethiopian phone number format: +251 or 0 followed by 9 or 7 and 8 more digits
const ethiopianPhoneRegex = /^(\+251|0)[97]\d{8}$/

// Ethiopian TIN format: 10 digits
const ethiopianTINRegex = /^\d{10}$/

// Peachtree-standard vendor types
export const vendorTypes = [
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider' },
  { value: 'OTHER', label: 'Other' },
] as const

// Peachtree-standard payment terms (reused from customer)
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

// Address validation schema
export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
})

// Vendor create/update validation schema
export const vendorSchema = z.object({
  vendorNumber: z.string().optional(),
  name: z.string().min(1, 'Vendor name is required').max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .optional()
    .or(z.literal('')),
  address: addressSchema.optional(),
  taxId: z
    .string()
    .max(50, 'Tax ID must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  // Peachtree-standard fields
  vendorType: z.enum(['SUPPLIER', 'CONTRACTOR', 'GOVERNMENT', 'UTILITY', 'SERVICE_PROVIDER', 'OTHER']).optional().default('SUPPLIER'),
  paymentTerms: z.enum(['DUE_ON_RECEIPT', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', '2_10_NET_30', 'COD']).optional().default('NET_30'),
  contactName: z.string().max(100).optional().or(z.literal('')),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  creditLimit: z
    .number()
    .nonnegative('Credit limit must be positive')
    .optional()
    .or(z.nan()),
  taxExempt: z.boolean().optional().default(false),
  taxExemptNumber: z.string().max(50).optional().or(z.literal('')),
})

// Type inference from schema
export type VendorFormValues = z.infer<typeof vendorSchema>

// Helper function to calculate due date based on payment terms
export function calculateDueDate(billDate: Date, terms: string): Date {
  const termConfig = paymentTerms.find(t => t.value === terms)
  const daysToAdd = termConfig?.days ?? 30

  const dueDate = new Date(billDate)
  dueDate.setDate(dueDate.getDate() + daysToAdd)
  return dueDate
}

// Search/filter validation
export const vendorFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  sortBy: z.enum(['name', 'vendorNumber', 'balance', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
})

export type VendorFiltersValues = z.infer<typeof vendorFiltersSchema>
