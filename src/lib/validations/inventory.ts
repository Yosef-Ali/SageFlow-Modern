import { z } from 'zod'

export const itemFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional()
})

export const itemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  type: z.enum(['PRODUCT', 'SERVICE', 'BUNDLE']).default('PRODUCT'),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  reorderPoint: z.number().min(0).default(0),
  reorderQuantity: z.number().min(0).default(0),
  quantityOnHand: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  // Peachtree-standard fields
  sellingPrice2: z.number().min(0).optional(),
  sellingPrice3: z.number().min(0).optional(),
  taxable: z.boolean().default(true),
  barcode: z.string().optional(),
  location: z.string().optional(),
  weight: z.number().min(0).optional(),
  weightUnit: z.string().default('Kg'),
})

export const assemblySchema = z.object({
  name: z.string().min(1, 'Assembly name is required'),
  itemId: z.string().min(1, 'Item is required'),
  description: z.string().optional(),
  yieldQuantity: z.number().min(1).default(1),
  components: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().min(0.0001)
  })).min(1, 'At least one component is required')
})

export const buildAssemblySchema = z.object({
  assemblyId: z.string().min(1, 'Assembly is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  date: z.date().default(() => new Date())
})

export const inventoryAdjustmentSchema = z.object({
  date: z.date(),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number(), // Can be negative/positive
    unitCost: z.number().optional()
  })).min(1, 'At least one item is required')
})

export type ItemFiltersValues = z.infer<typeof itemFiltersSchema>
export type ItemFormValues = z.infer<typeof itemSchema>
export type AssemblyFormValues = z.infer<typeof assemblySchema>
export type BuildAssemblyFormValues = z.infer<typeof buildAssemblySchema>
export type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentSchema>
