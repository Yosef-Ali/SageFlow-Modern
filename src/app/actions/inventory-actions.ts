'use server'

import { db } from '@/db'
import { items, itemCategories } from '@/db/schema'
import { eq, and, ilike, gte, lte, desc, asc, count, sql } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schemas
const itemSchema = z.object({
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
})

const itemFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE', 'BUNDLE']).optional(),
  isActive: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
})

export type ItemFormValues = z.infer<typeof itemSchema>
export type ItemFiltersValues = z.infer<typeof itemFiltersSchema>

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get list of inventory items with filters
 */
export async function getItems(
  filters?: Partial<ItemFiltersValues>
): Promise<ActionResult<{ items: any[]; total: number }>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validatedFilters = itemFiltersSchema.parse(filters || {})

    // Build where conditions
    const conditions = [eq(items.companyId, companyId)]

    if (validatedFilters.search) {
      const searchTerm = `%${validatedFilters.search}%`
      conditions.push(
        sql`(${items.name} ILIKE ${searchTerm} OR ${items.sku} ILIKE ${searchTerm} OR ${items.description} ILIKE ${searchTerm})`
      )
    }

    if (validatedFilters.categoryId) {
      conditions.push(eq(items.categoryId, validatedFilters.categoryId))
    }

    if (validatedFilters.type) {
      conditions.push(eq(items.type, validatedFilters.type))
    }

    if (validatedFilters.isActive !== undefined) {
      conditions.push(eq(items.isActive, validatedFilters.isActive))
    }

    if (validatedFilters.lowStock) {
      conditions.push(sql`${items.quantityOnHand} <= ${items.reorderPoint}`)
    }

    const whereClause = and(...conditions)

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(items)
      .where(whereClause)

    // Build orderBy
    const sortableColumns = {
      name: items.name,
      sku: items.sku,
      quantityOnHand: items.quantityOnHand,
      sellingPrice: items.sellingPrice,
      createdAt: items.createdAt,
    } as const

    const sortField = validatedFilters.sortBy || 'createdAt'
    const sortOrder = validatedFilters.sortOrder || 'desc'
    const orderByColumn = sortableColumns[sortField as keyof typeof sortableColumns] ?? items.createdAt
    const orderBy = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)

    // Get items with relations
    const limit = validatedFilters.limit || 20
    const page = validatedFilters.page || 1
    const offset = (page - 1) * limit

    const itemList = await db.query.items.findMany({
      where: whereClause,
      orderBy,
      limit,
      offset,
      with: {
        category: {
          columns: { id: true, name: true },
        },
      },
    })

    return {
      success: true,
      data: { items: itemList, total },
    }
  } catch (error) {
    console.error('Error fetching items:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch items',
    }
  }
}

/**
 * Get a single item by ID
 */
export async function getItem(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const item = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.companyId, companyId)),
      with: {
        category: {
          columns: { id: true, name: true },
        },
      },
    })

    if (!item) {
      return { success: false, error: 'Item not found' }
    }

    return { success: true, data: item }
  } catch (error) {
    console.error('Error fetching item:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch item',
    }
  }
}

/**
 * Create a new inventory item
 */
export async function createItem(data: ItemFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validatedData = itemSchema.parse(data)

    const [newItem] = await db
      .insert(items)
      .values({
        companyId,
        sku: validatedData.sku,
        name: validatedData.name,
        description: validatedData.description || null,
        categoryId: validatedData.categoryId || null,
        unitOfMeasure: validatedData.unitOfMeasure,
        type: validatedData.type,
        costPrice: String(validatedData.costPrice),
        sellingPrice: String(validatedData.sellingPrice),
        reorderPoint: String(validatedData.reorderPoint),
        reorderQuantity: String(validatedData.reorderQuantity),
        quantityOnHand: String(validatedData.quantityOnHand),
        isActive: validatedData.isActive,
      })
      .returning()

    revalidatePath('/dashboard/inventory')

    return { success: true, data: newItem }
  } catch (error) {
    console.error('Error creating item:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create item',
    }
  }
}

/**
 * Update an existing inventory item
 */
export async function updateItem(id: string, data: ItemFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validatedData = itemSchema.parse(data)

    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.companyId, companyId)),
    })

    if (!existingItem) {
      return { success: false, error: 'Item not found' }
    }

    const [updatedItem] = await db
      .update(items)
      .set({
        sku: validatedData.sku,
        name: validatedData.name,
        description: validatedData.description || null,
        categoryId: validatedData.categoryId || null,
        unitOfMeasure: validatedData.unitOfMeasure,
        type: validatedData.type,
        costPrice: String(validatedData.costPrice),
        sellingPrice: String(validatedData.sellingPrice),
        reorderPoint: String(validatedData.reorderPoint),
        reorderQuantity: String(validatedData.reorderQuantity),
        quantityOnHand: String(validatedData.quantityOnHand),
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .returning()

    revalidatePath('/dashboard/inventory')
    revalidatePath(`/dashboard/inventory/${id}`)

    return { success: true, data: updatedItem }
  } catch (error) {
    console.error('Error updating item:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update item',
    }
  }
}

/**
 * Delete an inventory item
 */
export async function deleteItem(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.companyId, companyId)),
    })

    if (!existingItem) {
      return { success: false, error: 'Item not found' }
    }

    await db.delete(items).where(eq(items.id, id))

    revalidatePath('/dashboard/inventory')

    return { success: true }
  } catch (error) {
    console.error('Error deleting item:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete item',
    }
  }
}

/**
 * Get item categories
 */
export async function getItemCategories(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const categories = await db.query.itemCategories.findMany({
      where: eq(itemCategories.companyId, companyId),
      orderBy: asc(itemCategories.name),
    })

    return { success: true, data: categories }
  } catch (error) {
    console.error('Error fetching categories:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories',
    }
  }
}

/**
 * Get inventory summary stats
 */
export async function getInventorySummary(): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const [stats] = await db
      .select({
        totalItems: count(),
        totalValue: sql<number>`COALESCE(SUM(CAST(${items.quantityOnHand} AS DECIMAL) * CAST(${items.costPrice} AS DECIMAL)), 0)`,
        lowStockCount: sql<number>`COUNT(CASE WHEN CAST(${items.quantityOnHand} AS DECIMAL) <= CAST(${items.reorderPoint} AS DECIMAL) THEN 1 END)`,
        outOfStockCount: sql<number>`COUNT(CASE WHEN CAST(${items.quantityOnHand} AS DECIMAL) = 0 THEN 1 END)`,
      })
      .from(items)
      .where(and(eq(items.companyId, companyId), eq(items.isActive, true)))

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching inventory summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch summary',
    }
  }
}
