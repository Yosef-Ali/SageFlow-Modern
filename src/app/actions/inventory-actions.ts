'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  items, stockMovements,
  assemblies, assemblyItems,
  inventoryAdjustments, adjustmentItems, itemCategories
} from '@/db/schema'
import { eq, desc, and, inArray, sql, asc, or, ilike } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  AssemblyFormValues,
  BuildAssemblyFormValues,
  InventoryAdjustmentFormValues,
  ItemFormValues,
  ItemFiltersValues
} from '@/lib/validations/inventory'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// --- ITEMS CRUD ---

export async function createItem(data: ItemFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Check SKU uniqueness
    const existing = await db.query.items.findFirst({
      where: and(eq(items.companyId, companyId), eq(items.sku, data.sku))
    })
    if (existing) return { success: false, error: 'SKU already exists' }

    await db.insert(items).values({
      companyId,
      sku: data.sku,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      unitOfMeasure: data.unitOfMeasure,
      type: data.type,
      costPrice: String(data.costPrice),
      sellingPrice: String(data.sellingPrice),
      sellingPrice2: data.sellingPrice2 ? String(data.sellingPrice2) : null,
      sellingPrice3: data.sellingPrice3 ? String(data.sellingPrice3) : null,
      reorderPoint: String(data.reorderPoint || 0),
      reorderQuantity: String(data.reorderQuantity || 0),
      preferredVendorId: data.preferredVendorId,
      taxable: data.taxable,
      weight: data.weight ? String(data.weight) : null,
      weightUnit: data.weightUnit,
      barcode: data.barcode,
      location: data.location,
      quantityOnHand: '0', // Initial is 0, use adjustment to set initial
    })

    revalidatePath('/dashboard/inventory/items')
    return { success: true, data: { message: 'Item created successfully' } }
  } catch (error) {
    return { success: false, error: 'Failed to create item' }
  }
}

export async function updateItem(id: string, data: ItemFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const existing = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.companyId, companyId))
    })
    if (!existing) return { success: false, error: 'Item not found' }

    await db.update(items).set({
      sku: data.sku,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      unitOfMeasure: data.unitOfMeasure,
      type: data.type,
      costPrice: String(data.costPrice),
      sellingPrice: String(data.sellingPrice),
      sellingPrice2: data.sellingPrice2 ? String(data.sellingPrice2) : null,
      sellingPrice3: data.sellingPrice3 ? String(data.sellingPrice3) : null,
      reorderPoint: String(data.reorderPoint || 0),
      reorderQuantity: String(data.reorderQuantity || 0),
      preferredVendorId: data.preferredVendorId,
      taxable: data.taxable,
      weight: data.weight ? String(data.weight) : null,
      weightUnit: data.weightUnit,
      barcode: data.barcode,
      location: data.location,
      updatedAt: new Date()
    }).where(eq(items.id, id))

    revalidatePath('/dashboard/inventory/items')
    revalidatePath(`/dashboard/inventory/items/${id}`)
    return { success: true, data: { message: 'Item updated successfully' } }
  } catch (error) {
    return { success: false, error: 'Failed to update item' }
  }
}

export async function deleteItem(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    // Soft delete
    await db.update(items)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(items.id, id), eq(items.companyId, companyId)))

    revalidatePath('/dashboard/inventory/items')
    return { success: true, data: { message: 'Item deleted' } }
  } catch (error) {
    return { success: false, error: 'Failed to delete item' }
  }
}

export async function getItems(filters?: Partial<ItemFiltersValues>): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const conditions = [
      eq(items.companyId, companyId),
      eq(items.isActive, true)
    ]

    if (filters?.search) {
      const search = `%${filters.search}%`
      conditions.push(or(
        ilike(items.sku, search),
        ilike(items.name, search)
      )!)
    }

    const list = await db.query.items.findMany({
      where: and(...conditions),
      with: { category: true },
      orderBy: desc(items.createdAt)
    })
    return { success: true, data: list }
  } catch (error) {
    return { success: false, error: 'Failed to fetch items' }
  }
}

export async function getItem(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const item = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.companyId, companyId)),
      with: {
        category: true,
        stockMovements: {
          orderBy: desc(stockMovements.date),
          limit: 50
        }
      }
    })
    if (!item) return { success: false, error: 'Item not found' }
    return { success: true, data: item }
  } catch (error) {
    return { success: false, error: 'Failed to fetch item' }
  }
}

export async function getItemCategories(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const categories = await db.query.itemCategories.findMany({
      where: eq(itemCategories.companyId, companyId),
      orderBy: asc(itemCategories.name)
    })
    return { success: true, data: categories }
  } catch (error) {
    return { success: false, error: 'Failed to fetch categories' }
  }
}

export async function getInventorySummary(): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const list = await db.query.items.findMany({
      where: and(eq(items.companyId, companyId), eq(items.isActive, true))
    })

    const totalItems = list.length
    const totalValue = list.reduce((sum, i) => sum + (Number(i.quantityOnHand) * Number(i.costPrice)), 0)
    const lowStock = list.filter(i => Number(i.quantityOnHand) <= Number(i.reorderPoint) && Number(i.quantityOnHand) > 0).length
    const outOfStock = list.filter(i => Number(i.quantityOnHand) <= 0).length

    return {
      success: true,
      data: { totalItems, totalValue, lowStock, outOfStock }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch summary' }
  }
}


// --- ASSEMBLIES (BOM) ---

export async function createAssemblyDefinition(data: AssemblyFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    await db.transaction(async (tx) => {
      // Create Assembly Header
      const [newAssembly] = await tx.insert(assemblies).values({
        companyId,
        itemId: data.itemId,
        description: data.description,
        yieldQuantity: String(data.yieldQuantity),
        // createdAt: new Date() // defaultNow
      }).returning()

      // Create Assembly Items
      if (data.items.length > 0) {
        await tx.insert(assemblyItems).values(
          data.items.map(item => ({
            assemblyId: newAssembly.id,
            itemId: item.itemId,
            quantity: String(item.quantity) // This is qty needed per yield
          }))
        )
      }
    })

    revalidatePath('/dashboard/inventory/assemblies')
    return { success: true, data: { message: 'Assembly definition created' } }
  } catch (error) {
    console.error('Create Assembly Error:', error)
    return { success: false, error: 'Failed to create assembly definition' }
  }
}

export async function getAssemblies(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const list = await db.query.assemblies.findMany({
      where: eq(assemblies.companyId, companyId),
      with: {
        item: true, // The built item
        components: {
          with: { item: true }
        }
      },
      orderBy: desc(assemblies.createdAt)
    })
    return { success: true, data: list }
  } catch (error) {
    return { success: false, error: 'Failed to fetch assemblies' }
  }
}

export async function buildAssembly(data: BuildAssemblyFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // 1. Fetch Assembly Definition
    const assembly = await db.query.assemblies.findFirst({
      where: and(eq(assemblies.id, data.assemblyId), eq(assemblies.companyId, companyId)),
      with: { components: true }
    })

    if (!assembly) return { success: false, error: 'Assembly definition not found' }

    const buildQty = Number(data.quantity)
    const yieldQty = Number(assembly.yieldQuantity) || 1
    const multiplier = buildQty / yieldQty // How many "sets" we are building

    await db.transaction(async (tx) => {
      // 2. Consume Components
      for (const comp of assembly.components) {
        const qtyToConsume = Number(comp.quantity) * multiplier

        // Update Stock
        await tx.update(items)
          .set({
            quantityOnHand: sql`${items.quantityOnHand} - ${String(qtyToConsume)}`,
            updatedAt: new Date()
          })
          .where(eq(items.id, comp.itemId))

        // Log Movement
        await tx.insert(stockMovements).values({
          itemId: comp.itemId,
          type: 'ADJUSTMENT', // Using ADJUSTMENT for assembly consumption
          quantity: String(qtyToConsume),
          referenceType: 'ASSEMBLY_BUILD',
          referenceId: assembly.id,
          date: data.date,
        })
      }

      // 3. Produce Finished Item
      await tx.update(items)
        .set({
          quantityOnHand: sql`${items.quantityOnHand} + ${String(buildQty)}`,
          updatedAt: new Date()
        })
        .where(eq(items.id, assembly.itemId))

      // Log Movement
      await tx.insert(stockMovements).values({
        itemId: assembly.itemId,
        type: 'ADJUSTMENT',
        quantity: String(buildQty),
        referenceType: 'ASSEMBLY_BUILD',
        referenceId: assembly.id,
        date: data.date,
      })
    })

    revalidatePath('/dashboard/inventory/items')
    revalidatePath('/dashboard/inventory/assemblies')
    return { success: true, data: { message: 'Assembly built successfully' } }

  } catch (error) {
    console.error('Build Assembly Error:', error)
    return { success: false, error: 'Failed to build assembly' }
  }
}

// --- ADJUSTMENTS ---

export async function createInventoryAdjustment(data: InventoryAdjustmentFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    await db.transaction(async (tx) => {
      // 1. Create Adjustment Header
      const [adj] = await tx.insert(inventoryAdjustments).values({
        companyId,
        date: data.date,
        reason: data.reason,
        reference: data.reference
      }).returning()

      // 2. Process Items
      for (const item of data.items) {
        const qty = Number(item.quantity)
        const type = qty >= 0 ? 'IN' : 'OUT'
        const absQty = Math.abs(qty)

        // Insert Line
        await tx.insert(adjustmentItems).values({
          adjustmentId: adj.id,
          itemId: item.itemId,
          quantity: String(qty),
          unitCost: item.unitCost ? String(item.unitCost) : null
        })

        // Update Stock
        await tx.update(items)
          .set({
            quantityOnHand: sql`${items.quantityOnHand} + ${String(qty)}`, // works for negative too
            updatedAt: new Date()
          })
          .where(eq(items.id, item.itemId))

        // Log Movement
        await tx.insert(stockMovements).values({
          itemId: item.itemId,
          type: 'ADJUSTMENT',
          quantity: String(absQty),
          referenceType: 'ADJUSTMENT',
          referenceId: adj.id,
          date: data.date,
          cost: item.unitCost ? String(item.unitCost) : undefined
        })
      }
    })

    revalidatePath('/dashboard/inventory/items')
    return { success: true, data: { message: 'Adjustment recorded' } }
  } catch (error) {
    console.error('Adjustment Error:', error)
    return { success: false, error: 'Failed to record adjustment' }
  }
}

// Export types for hooks
export type { ItemFormValues, ItemFiltersValues }

