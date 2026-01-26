import { supabase } from "@/lib/supabase"
import { PurchaseFormValues, BillFormValues } from "@/lib/validations/purchase"
import type { ActionResult } from "@/types/api"

// Re-export types for hooks
export type { PurchaseFormValues as PurchaseOrderFormValues, BillFormValues }

// ============ Peachtree-style Bill Number Generation ============

/**
 * Generate Peachtree-style bill number
 * Format: BILL-YYYYMM-XXXXX (e.g., BILL-202601-00001)
 */
async function generateBillNumber(companyId: string): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `BILL-${yearMonth}-`

  // Get the last bill number for this month
  const { data } = await supabase
    .from('bills')
    .select('bill_number')
    .eq('company_id', companyId)
    .like('bill_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0 && data[0].bill_number) {
    const lastNumMatch = data[0].bill_number.match(/(\d+)$/)
    if (lastNumMatch) {
      nextNum = parseInt(lastNumMatch[1]) + 1
    }
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`
}

/**
 * Update vendor balance helper
 */
async function updateVendorBalance(vendorId: string, amountDelta: number): Promise<void> {
  const { data: vendor } = await supabase
    .from('vendors')
    .select('balance')
    .eq('id', vendorId)
    .single()

  if (vendor) {
    const newBalance = (Number(vendor.balance) || 0) + amountDelta
    await supabase
      .from('vendors')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', vendorId)
  }
}

// ============ Purchase Orders ============

export async function getPurchaseOrders(filters?: { status?: string; vendorId?: string }): Promise<ActionResult<any[]>> {
  try {
    let query = supabase
      .from('purchase_orders')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId)
    }

    const { data: pos, error } = await query
    if (error) throw error

    if (!pos || pos.length === 0) {
      return { success: true, data: [] }
    }

    // Manual join for vendors
    const vendorIds = [...new Set(pos.map(p => p.vendor_id).filter(Boolean))]

    let vendorsMap: Record<string, any> = {}
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name')
        .in('id', vendorIds)

      if (vendors) {
        vendors.forEach(v => {
          vendorsMap[v.id] = v
        })
      }
    }

    // Map vendors to POs
    const data = pos.map(po => ({
      ...po,
      vendor: vendorsMap[po.vendor_id] || null
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching purchase orders:", error)
    return { success: false, error: error.message || "Failed to fetch purchase orders" }
  }
}

export async function getPurchaseOrder(id: string): Promise<ActionResult<any>> {
  try {
    // 1. Fetch PO
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!po) throw new Error('Purchase Order not found')

    // 2. Fetch Vendor
    let vendor = null
    if (po.vendor_id) {
      const { data: v } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', po.vendor_id)
        .single()
      vendor = v
    }

    // 3. Fetch Items
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', id)

    // Manual Join
    return {
      success: true,
      data: {
        ...po,
        vendor,
        items: items || []
      }
    }
  } catch (error: any) {
    console.error("Error fetching purchase order:", error)
    return { success: false, error: "Failed to fetch purchase order" }
  }
}

export async function createPurchaseOrder(data: PurchaseFormValues): Promise<ActionResult<any>> {
  try {
    // Calculate total amount
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

    const { data: newPO, error } = await supabase.from('purchase_orders').insert({
      vendor_id: data.vendorId,
      po_number: `PO-${Date.now().toString().slice(-6)}`,
      date: data.date,
      expected_date: data.expectedDate,
      status: data.status,
      total_amount: totalAmount,
      notes: data.notes
    }).select().single()

    if (error) throw error

    // Items
    if (data.items?.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        po_id: newPO.id,
        item_id: item.itemId,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        total: item.quantity * item.unitCost
      }))
      await supabase.from('purchase_order_items').insert(itemsToInsert)
    }

    return { success: true, data: newPO }
  } catch (error: any) {
    console.error("Error creating purchase order:", error)
    return { success: false, error: "Failed to create purchase order" }
  }
}

// ============ Bills ============

export async function getBills(filters?: { status?: string; vendorId?: string }): Promise<ActionResult<any[]>> {
  try {
    let query = supabase
      .from('bills')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    const { data: bills, error } = await query
    if (error) throw error

    if (!bills || bills.length === 0) {
      return { success: true, data: [] }
    }

    // Manual join for vendors
    const vendorIds = [...new Set(bills.map(b => b.vendor_id).filter(Boolean))]

    let vendorsMap: Record<string, any> = {}
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name')
        .in('id', vendorIds)

      if (vendors) {
        vendors.forEach(v => {
          vendorsMap[v.id] = v
        })
      }
    }

    // Map vendors to Bills
    const data = bills.map(bill => ({
      ...bill,
      vendor: vendorsMap[bill.vendor_id] || null
    }))

    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching bills:", error)
    return { success: false, error: error.message || "Failed to fetch bills" }
  }
}

export async function getBill(id: string): Promise<ActionResult<any>> {
  try {
    // 1. Fetch Bill
    const { data: bill, error } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!bill) throw new Error('Bill not found')

    // 2. Fetch Vendor
    let vendor = null
    if (bill.vendor_id) {
      const { data: v } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', bill.vendor_id)
        .single()
      vendor = v
    }

    return {
      success: true,
      data: {
        ...bill,
        vendor
      }
    }
  } catch (error: any) {
    console.error("Error fetching bill:", error)
    return { success: false, error: "Failed to fetch bill" }
  }
}

export async function createBill(data: BillFormValues, companyId?: string): Promise<ActionResult<any>> {
  try {
    // Generate Peachtree-style bill number if not provided
    const billNumber = data.billNumber?.trim()
      ? data.billNumber.trim()
      : companyId
        ? await generateBillNumber(companyId)
        : `BILL-${Date.now().toString().slice(-8)}`

    const { data: newBill, error } = await supabase.from('bills').insert({
      vendor_id: data.vendorId,
      bill_number: billNumber,
      date: data.date,
      due_date: data.dueDate,
      total_amount: data.totalAmount,
      paid_amount: 0,
      status: 'OPEN',
      notes: data.notes,
      company_id: companyId
    }).select().single()

    if (error) throw error

    // ============ PEACHTREE LOGIC: Update Vendor Balance ============
    // Increase vendor balance (AP) when bill is created
    await updateVendorBalance(data.vendorId, Number(data.totalAmount))
    console.log(`[createBill] Vendor ${data.vendorId} balance increased by ${data.totalAmount}`)

    return { success: true, data: newBill }
  } catch (error: any) {
    console.error("Error creating bill:", error)
    return { success: false, error: error.message || "Failed to create bill" }
  }
}

/**
 * Update an existing bill with balance reversal logic
 */
export async function updateBill(id: string, data: BillFormValues): Promise<ActionResult<any>> {
  try {
    // ============ PEACHTREE LOGIC: Reverse old balance effects first ============

    // Fetch original bill
    const { data: oldBill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!oldBill) throw new Error('Bill not found')

    // Cannot edit paid bills
    if (oldBill.status === 'PAID') {
      return { success: false, error: 'Cannot edit a paid bill. Void it first.' }
    }

    const oldAmount = Number(oldBill.total_amount) || 0
    const newAmount = Number(data.totalAmount)
    const amountDiff = newAmount - oldAmount

    // Handle vendor balance changes
    if (oldBill.vendor_id === data.vendorId) {
      // Same vendor - just adjust the difference
      if (amountDiff !== 0) {
        await updateVendorBalance(data.vendorId, amountDiff)
        console.log(`[updateBill] Vendor ${data.vendorId} balance adjusted by ${amountDiff}`)
      }
    } else {
      // Different vendor - reverse from old, apply to new
      // Reduce old vendor balance
      await updateVendorBalance(oldBill.vendor_id, -oldAmount)
      console.log(`[updateBill] Old vendor ${oldBill.vendor_id} balance reduced by ${oldAmount}`)

      // Increase new vendor balance
      await updateVendorBalance(data.vendorId, newAmount)
      console.log(`[updateBill] New vendor ${data.vendorId} balance increased by ${newAmount}`)
    }

    // Update the bill record
    const { data: updated, error } = await supabase.from('bills').update({
      vendor_id: data.vendorId,
      bill_number: data.billNumber,
      date: data.date,
      due_date: data.dueDate,
      total_amount: newAmount,
      notes: data.notes,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single()

    if (error) throw error
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Error updating bill:", error)
    return { success: false, error: error.message || "Failed to update bill" }
  }
}

/**
 * Delete a bill with balance reversal
 */
export async function deleteBill(id: string): Promise<ActionResult<void>> {
  try {
    // ============ PEACHTREE LOGIC: Reverse balance before deletion ============

    // Fetch bill first
    const { data: bill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!bill) throw new Error('Bill not found')

    // Cannot delete paid bills
    if (bill.status === 'PAID') {
      return { success: false, error: 'Cannot delete a paid bill. Void it first.' }
    }

    // Reverse vendor balance (subtract the unpaid portion)
    const unpaidAmount = Number(bill.total_amount) - Number(bill.paid_amount || 0)
    if (unpaidAmount > 0) {
      await updateVendorBalance(bill.vendor_id, -unpaidAmount)
      console.log(`[deleteBill] Vendor ${bill.vendor_id} balance reduced by ${unpaidAmount}`)
    }

    // Delete the bill
    const { error } = await supabase.from('bills').delete().eq('id', id)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting bill:", error)
    return { success: false, error: error.message || "Failed to delete bill" }
  }
}

/**
 * Record a payment against a bill (reduce AP)
 */
export async function recordBillPayment(
  billId: string,
  amount: number,
  paymentMethod: string,
  reference?: string
): Promise<ActionResult<void>> {
  try {
    // Fetch bill
    const { data: bill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', billId)
      .single()

    if (fetchError) throw fetchError
    if (!bill) throw new Error('Bill not found')

    const newPaidAmount = Number(bill.paid_amount || 0) + amount
    const billTotal = Number(bill.total_amount)

    // Peachtree-style status determination
    let newStatus: string
    if (newPaidAmount >= billTotal) {
      newStatus = 'PAID'
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIALLY_PAID'
    } else {
      newStatus = 'OPEN'
    }

    // Update bill
    const { error: updateError } = await supabase.from('bills').update({
      paid_amount: newPaidAmount,
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', billId)

    if (updateError) throw updateError

    // ============ PEACHTREE LOGIC: Reduce Vendor Balance ============
    // Payment reduces AP (vendor balance)
    await updateVendorBalance(bill.vendor_id, -amount)
    console.log(`[recordBillPayment] Bill ${billId}: paid=${newPaidAmount}, status=${newStatus}`)
    console.log(`[recordBillPayment] Vendor ${bill.vendor_id} balance reduced by ${amount}`)

    return { success: true }
  } catch (error: any) {
    console.error("Error recording bill payment:", error)
    return { success: false, error: error.message || "Failed to record payment" }
  }
}
