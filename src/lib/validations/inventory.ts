import { z } from 'zod'

export const assemblyItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.number().min(0.0001, 'Quantity must be greater than 0'),
})

export const assemblySchema = z.object({
  itemId: z.string().min(1, 'Item to build is required'),
  description: z.string().optional(),
  yieldQuantity: z.number().min(1, 'Yield quantity must be at least 1').default(1),
  items: z.array(assemblyItemSchema).min(1, 'At least one component is required'),
})

export type AssemblyFormValues = z.infer<typeof assemblySchema>

export const buildAssemblySchema = z.object({
  assemblyId: z.string().min(1, 'Assembly ID is required'),
  quantity: z.number().min(1, 'Quantity to build must be at least 1'),
  date: z.date(),
})

export type BuildAssemblyFormValues = z.infer<typeof buildAssemblySchema>

export const adjustmentItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.number(), // Can be negative
  unitCost: z.number().min(0).optional(),
})

export const inventoryAdjustmentSchema = z.object({
  date: z.date(),
  reason: z.string().optional(),
  reference: z.string().optional(),
  items: z.array(adjustmentItemSchema).min(1, 'At least one item is required'),
})

export type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentSchema>

export const itemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().default('Each'),
  type: z.enum(['PRODUCT', 'SERVICE', 'BUNDLE']).default('PRODUCT'),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  sellingPrice2: z.number().optional(),
  sellingPrice3: z.number().optional(),
  reorderPoint: z.number().optional(),
  reorderQuantity: z.number().optional(),
  preferredVendorId: z.string().optional(),
  taxable: z.boolean().default(true),
  weight: z.number().optional(),
  weightUnit: z.string().optional(),
  barcode: z.string().optional(),
  location: z.string().optional(),
})

export type ItemFormValues = z.infer<typeof itemSchema>

export interface ItemFiltersValues {
  search?: string
  categoryId?: string
  status?: string
}
