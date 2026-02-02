import { supabase } from "@/lib/supabase"
import { ItemFormValues, ItemFiltersValues, AssemblyFormValues } from "@/lib/validations/inventory"
import { logAuditAction } from "./audit-actions"
import { verifyRole } from "./auth-helpers"
export type { ItemFormValues, ItemFiltersValues, AssemblyFormValues }

function mapItemFromDb(dbItem: any) {
  if (!dbItem) return null
  return {
    id: dbItem.id,
    sku: dbItem.sku,
    name: dbItem.name,
    description: dbItem.description || '',
    categoryId: dbItem.category_id,
    unitOfMeasure: dbItem.unit_of_measure || 'Each',
    type: dbItem.type || 'PRODUCT',
    costPrice: dbItem.cost_price,
    sellingPrice: dbItem.selling_price,
    reorderPoint: dbItem.reorder_point,
    reorderQuantity: dbItem.reorder_quantity,
    quantityOnHand: dbItem.quantity_on_hand,
    isActive: dbItem.is_active,
    sellingPrice2: dbItem.selling_price_2,
    sellingPrice3: dbItem.selling_price_3,
    taxable: dbItem.taxable,
    barcode: dbItem.barcode || '',
    location: dbItem.location || '',
    weight: dbItem.weight,
    weightUnit: dbItem.weight_unit || 'Kg',
    category: dbItem.category, // Assuming it's already joined or handled
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  }
}

// ============ Peachtree-style Adjustment Number Generation ============

/**
 * Generate Peachtree-style adjustment number
 * Format: ADJ-YYYYMM-XXXXX (e.g., ADJ-202601-00001)
 */
async function generateAdjustmentNumber(companyId?: string): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `ADJ-${yearMonth}-`

  // Get the last adjustment number for this month
  // Note: This assumes an 'inventory_adjustments' table exists with 'adjustment_number' column
  // If the table doesn't exist, fall back to timestamp-based number
  try {
    const { data } = await supabase
      .from('inventory_adjustments')
      .select('adjustment_number')
      .like('adjustment_number', `${prefix}%`)
      .order('created_at', { ascending: false })
      .limit(1)

    let nextNum = 1
    if (data && data.length > 0 && data[0].adjustment_number) {
      const lastNumMatch = data[0].adjustment_number.match(/(\d+)$/)
      if (lastNumMatch) {
        nextNum = parseInt(lastNumMatch[1]) + 1
      }
    }

    return `${prefix}${String(nextNum).padStart(5, '0')}`
  } catch {
    // Table doesn't exist, use timestamp-based number
    return `${prefix}${Date.now().toString().slice(-5)}`
  }
}

export async function getItems(companyId: string, filters?: Partial<ItemFiltersValues>) {
  try {
    if (!companyId) {
      return { success: false, error: "Company ID is required" }
    }
    let query = supabase
      .from('items')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    const { data: items, error } = await query
    if (error) throw error

    if (!items || items.length === 0) {
      return { success: true, data: [] }
    }

    // Manual join for categories
    const categoryIds = [...new Set(items.map(i => i.category_id).filter(Boolean))]

    let categoriesMap: Record<string, any> = {}
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('item_categories')
        .select('id, name')
        .in('id', categoryIds)

      if (categories) {
        categories.forEach(c => {
          categoriesMap[c.id] = c
        })
      }
    }

    // Map categories to Items and use mapper, filter out nulls
    const data = items.map(item => mapItemFromDb({
      ...item,
      category: categoriesMap[item.category_id] || null
    })).filter((item): item is NonNullable<typeof item> => item !== null)

    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching items:", error)
    return { success: false, error: error.message || "Failed to fetch items" }
  }
}

export async function getItem(id: string) {
  try {
    // 1. Fetch Item
    const { data: item, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!item) throw new Error('Item not found')

    // 2. Fetch Category
    let category = null
    if (item.category_id) {
      const { data: cat } = await supabase
        .from('item_categories')
        .select('*')
        .eq('id', item.category_id)
        .single()
      category = cat
    }

    return {
      success: true,
      data: mapItemFromDb({
        ...item,
        category
      })
    }
  } catch (error) {
    console.error("Error fetching item:", error)
    return { success: false, error: "Failed to fetch item" }
  }
}

export async function createItem(data: ItemFormValues & { companyId: string }) {
  try {
    const auth = await verifyRole(['ADMIN', 'MANAGER'])
    if (!auth.success) return { success: false, error: auth.error }

    if (!data.companyId) {
      return { success: false, error: "Company ID is required" }
    }
    const { data: newItem, error } = await supabase.from('items').insert({
      company_id: data.companyId,
      sku: data.sku,
      name: data.name,
      description: data.description,
      cost_price: data.costPrice,
      selling_price: data.sellingPrice,
      reorder_point: data.reorderPoint,
      reorder_quantity: data.reorderQuantity,
      quantity_on_hand: data.quantityOnHand,
      category_id: data.categoryId,
      unit_of_measure: data.unitOfMeasure,
      type: data.type,
      is_active: data.isActive,
      selling_price_2: data.sellingPrice2,
      selling_price_3: data.sellingPrice3,
      taxable: data.taxable,
      barcode: data.barcode,
      location: data.location,
      weight: data.weight,
      weight_unit: data.weightUnit,
    }).select().single()

    if (error) throw error

    // Log the creation
    await logAuditAction({
      company_id: data.companyId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'CREATE',
      entity_type: 'ITEM',
      entity_id: newItem.id,
      details: `Created item ${newItem.name} (SKU: ${newItem.sku})`,
    })

    return { success: true, data: newItem }
  } catch (error) {
    console.error("Error creating item:", error)
    return { success: false, error: "Failed to create item" }
  }
}

export async function updateItem(id: string, data: ItemFormValues) {
  try {
    const auth = await verifyRole(['ADMIN', 'MANAGER'])
    if (!auth.success) return { success: false, error: auth.error }

    const { error } = await supabase.from('items').update({
      sku: data.sku,
      name: data.name,
      description: data.description,
      cost_price: data.costPrice,
      selling_price: data.sellingPrice,
      reorder_point: data.reorderPoint,
      reorder_quantity: data.reorderQuantity,
      quantity_on_hand: data.quantityOnHand,
      category_id: data.categoryId,
      unit_of_measure: data.unitOfMeasure,
      type: data.type,
      is_active: data.isActive,
      selling_price_2: data.sellingPrice2,
      selling_price_3: data.sellingPrice3,
      taxable: data.taxable,
      barcode: data.barcode,
      location: data.location,
      weight: data.weight,
      weight_unit: data.weightUnit,
      updated_at: new Date()
    }).eq('id', id)

    if (error) throw error

    // Log the update
    await logAuditAction({
      company_id: (await supabase.from('items').select('company_id').eq('id', id).single()).data?.company_id || 'unknown',
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'UPDATE',
      entity_type: 'ITEM',
      entity_id: id,
      details: `Updated item details for ${data.name}`,
    })

    return { success: true, data: { id } }
  } catch (error) {
    console.error("Error updating item:", error)
    return { success: false, error: "Failed to update item" }
  }
}

export async function deleteItem(id: string) {
  try {
    const auth = await verifyRole(['ADMIN'])
    if (!auth.success) return { success: false, error: auth.error }

    const { error } = await supabase.from('items').update({ is_active: false }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to delete item" }
  }
}

export async function getItemCategories(companyId: string) {
  try {
    if (!companyId) {
      return { success: true, data: [] }
    }
    const { data } = await supabase.from('item_categories').select('*').eq('company_id', companyId)
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: "Failed to fetch categories" }
  }
}

export async function getInventorySummary(companyId: string) {
  try {
    if (!companyId) {
      return { success: true, data: { totalItems: 0, lowStockItems: 0, totalValue: 0 } }
    }
    const { count: totalItems } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('company_id', companyId)
    const { count: lowStock } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('company_id', companyId).lt('quantity_on_hand', 10) // Simplified rule

    return {
      success: true,
      data: {
        totalItems: totalItems || 0,
        lowStockItems: lowStock || 0,
        totalValue: 0,
      }
    }
  } catch (error) {
    return { success: false, error: "Failed to fetch inventory summary" }
  }
}

// ============ Assemblies ============

export async function getAssemblyDefinitions() {
  try {
    // Table 'assembly_definitions' doesn't exist in schema
    // Return empty data for now - assemblies feature not yet implemented
    return { success: true, data: [] }
  } catch (error: any) {
    console.error("Error fetching assemblies:", error)
    return { success: false, error: "Failed to fetch assemblies" }
  }
}

export async function createAssemblyDefinition(data: AssemblyFormValues) {
  try {
    const { data: newAssembly, error } = await supabase.from('assembly_definitions').insert({
      target_item_id: data.itemId,
      yield_quantity: data.yieldQuantity,
      description: data.description
    }).select().single()

    if (error) throw error

    if (data.components?.length > 0) {
      const components = data.components.map(item => ({
        assembly_id: newAssembly.id,
        component_item_id: item.itemId,
        quantity: item.quantity
      }))
      await supabase.from('assembly_components').insert(components)
    }

    return { success: true, data: newAssembly }
  } catch (error: any) {
    console.error("Error creating assembly:", error)
    return { success: false, error: "Failed to create assembly" }
  }
}

export async function buildAssembly(data: { assemblyId: string, quantity: number, date: Date }) {
  try {
    // This would involve complex transaction: increase stock of target, decrease stock of components
    // For now, simpler return
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to build assembly" }
  }
}

export async function updateItemStock(id: string, delta: number) {
  try {
    // 1. Get current stock
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select('quantity_on_hand')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const currentQty = Number(item.quantity_on_hand) || 0
    const newQty = currentQty + delta

    // 2. Update stock
    const { error: updateError } = await supabase
      .from('items')
      .update({
        quantity_on_hand: newQty,
        updated_at: new Date()
      })
      .eq('id', id)

    if (updateError) throw updateError

    return { success: true, newStock: newQty }
  } catch (error: any) {
    console.error(`Error updating stock for item ${id}:`, error)
    return { success: false, error: error.message || "Failed to update item stock" }
  }
}

export async function createInventoryAdjustment(data: any, companyId?: string) {
  try {
    const auth = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT'])
    if (!auth.success) return { success: false, error: auth.error }

    // 1. Validate data
    if (!data.items || data.items.length === 0) {
      return { success: false, error: "No items to adjust" }
    }

    // 2. Generate Peachtree-style adjustment number
    const adjustmentNumber = await generateAdjustmentNumber(companyId)
    console.log(`[createInventoryAdjustment] Generated number: ${adjustmentNumber}`)

    // 3. Try to create adjustment record if table exists
    try {
      const { data: adjustmentRecord, error: insertError } = await supabase
        .from('inventory_adjustments')
        .insert({
          adjustment_number: adjustmentNumber,
          company_id: companyId,
          date: data.date || new Date().toISOString(),
          reason: data.reason || 'Manual Adjustment',
          notes: data.notes || null,
          status: 'COMPLETED'
        })
        .select()
        .single()

      if (!insertError && adjustmentRecord) {
        // Insert adjustment items
        const adjustmentItems = data.items.map((item: any) => ({
          adjustment_id: adjustmentRecord.id,
          item_id: item.itemId,
          quantity_change: Number(item.quantity),
          reason: item.reason || data.reason || 'Adjustment'
        }))

        await supabase.from('inventory_adjustment_items').insert(adjustmentItems)
        console.log(`[createInventoryAdjustment] Recorded adjustment ${adjustmentRecord.id}`)
      }
    } catch {
      // Table doesn't exist - continue with direct stock updates
      console.log('[createInventoryAdjustment] Adjustment table not found, updating stock directly')
    }

    // 4. Process each item - update actual stock
    const results = []
    for (const item of data.items) {
      if (!item.itemId || item.quantity === undefined) continue

      const qty = Number(item.quantity) // Can be positive or negative

      // Update the actual item stock
      const result = await updateItemStock(item.itemId, qty)
      results.push({ ...result, itemId: item.itemId })
    }

    // Check if any failed
    const failures = results.filter(r => !r.success)
    if (failures.length > 0) {
      console.error('[createInventoryAdjustment] Some items failed:', failures)
      return { success: false, error: `Partially failed: ${failures.length} items could not be updated.` }
    }

    console.log(`[createInventoryAdjustment] Successfully adjusted ${results.length} items`)

    // Log the adjustment
    await logAuditAction({
      company_id: companyId || 'unknown',
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'ADJUST_INVENTORY',
      entity_type: 'STOCK',
      entity_id: adjustmentNumber,
      details: `Adjusted stock for ${results.length} items. Reason: ${data.reason}`,
    })

    return {
      success: true,
      data: {
        adjustmentNumber,
        itemsAdjusted: results.length
      }
    }
  } catch (error) {
    console.error("Error creating adjustment:", error)
    return { success: false, error: "Failed to create adjustment" }
  }
}
