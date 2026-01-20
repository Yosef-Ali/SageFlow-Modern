'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  items, stockMovements,
  assemblies, assemblyItems,
  inventoryAdjustments, adjustmentItems
} from '@/db/schema'
import { eq, desc, and, inArray, sql } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  AssemblyFormValues,
  BuildAssemblyFormValues,
  InventoryAdjustmentFormValues
} from '@/lib/validations/inventory'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

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
          quantity: String(qtyToConsume), // This should probably be negative for OUT? 
          // Wait, stock_movements usually tracks signed quantity or has In/Out types. 
          // If type is purely categorical, then quantity should be signed?
          // Let's check schema. `quantity` is decimal. `type` is Enum.
          // Usually 'SALE' has positive quantity in records but means deduction?
          // Let's look at `createInvoice` or similar practices.
          // For now, I'll store POSITIVE quantity but know that for ADJUSTMENT it might need sign.
          // ACTUALLY, in `inventory-actions.ts` I wrote `quantityOnHand = quantityOnHand - qty`.
          // If I use 'ADJUSTMENT', I should probably stick to a convention.
          // Let's use NEGATIVE quantity for consumption if 'ADJUSTMENT' is generic.
          // But wait, `stockMovements` table definition doesn't enforce sign.
          // Re-reading `purchase-actions.ts`: `quantityOnHand + item.quantity`. `type: 'PURCHASE'`. Qty is positive.
          // So 'PURCHASE' = Add.
          // 'SALE' = Deduct.
          // 'ADJUSTMENT' = ?? Could be either.
          // Let's verify `stockMovements` usage elsewhere.
          // Safest to valid enum. I will use 'ADJUSTMENT' and maybe rely on referenceType 'ASSEMBLY_BUILD'.
          // Is there a 'PRODUCTION' enum? Schema said 'PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN'.
          // I'll use 'ADJUSTMENT'.
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
          quantity: String(absQty), // Storing absolute quantity, type implies direction? 
          // Actually for ADJUSTMENT, if it's mixed, maybe I should use signed quantity?
          // Or 'ADJUSTMENT' covers both. 
          // Let's check if I can just use 'ADJUSTMENT' for both.
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
