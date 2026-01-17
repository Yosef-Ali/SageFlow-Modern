import { z } from 'zod'

// Ethiopian phone number format: +251 or 0 followed by 9 or 7 and 8 more digits
const ethiopianPhoneRegex = /^(\+251|0)[97]\d{8}$/

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
})

// Type inference from schema
export type CustomerFormValues = z.infer<typeof customerSchema>

// Search/filter validation
export const customerFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  sortBy: z.enum(['name', 'customerNumber', 'balance', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
})

export type CustomerFiltersValues = z.infer<typeof customerFiltersSchema>
