import { supabase } from "@/lib/supabase"
import { InvoiceFormValues, InvoiceFiltersValues, calculateInvoiceTotals } from "@/lib/validations/invoice"
import { formatSupabaseError } from "@/lib/error-utils"
import type { ActionResult } from "@/types/api"
import type { InvoiceStatus } from "@/db/schema"
import { updateItemStock } from "@/app/actions/inventory-actions"

export interface InvoiceWithCustomer {
  id: string
  invoiceNumber: string
  customerId: string
  date: string
  dueDate: string
  subtotal: string
  taxAmount: string
  discountAmount: string
  total: string
  paidAmount: string
  status: InvoiceStatus
  notes: string | null
  terms: string | null
  customer: {
    id: string
    name: string
    customerNumber?: string
  } | null
  items?: InvoiceItemData[]
  // Peachtree fields
  salesRepId?: string
  poNumber?: string
  shipMethod?: string
  shipDate?: string
  shipAddress?: any
  dropShip?: boolean
}

export interface InvoiceItemData {
  id: string
  invoiceId: string
  itemId: string | null
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
  total: string
}


// Helper to map DB row to Invoice type
function mapInvoiceFromDb(row: any): InvoiceWithCustomer {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    date: row.date,
    dueDate: row.due_date,
    subtotal: row.subtotal,
    taxAmount: row.tax_amount,
    discountAmount: row.discount_amount || '0',
    total: row.total,
    paidAmount: row.paid_amount || '0',
    status: row.status,
    notes: row.notes,
    terms: row.terms,
    salesRepId: row.sales_rep_id,
    poNumber: row.po_number,
    shipMethod: row.ship_method,
    shipDate: row.ship_date,
    shipAddress: row.ship_address,
    dropShip: row.drop_ship,
    customer: row.customers ? {
      id: row.customers.id,
      name: row.customers.name,
      customerNumber: row.customers.customer_number
    } : null,
    items: row.invoice_items ? row.invoice_items.map((item: any) => ({
      id: item.id,
      invoiceId: item.invoice_id,
      itemId: item.item_id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      taxRate: item.tax_rate,
      total: item.total
    })) : []
  }
}

/**
 * Generate next invoice number for a company
 */
async function generateInvoiceNumber(companyId: string): Promise<string> {
  // Safer approach: Get the highest number instead of just counting
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNumMatch = data[0].invoice_number.match(/\d+/)
    if (lastNumMatch) {
      nextNum = parseInt(lastNumMatch[0]) + 1
    }
  }

  return `INV-${String(nextNum).padStart(5, '0')}`
}

/**
 * Get invoices with optional filters
 */
export async function getInvoices(
  companyId: string,
  filters?: Partial<InvoiceFiltersValues>
): Promise<ActionResult<{ invoices: InvoiceWithCustomer[]; total: number }>> {
  try {
    // Fetch invoices (joining removed to fix Supabase 'relationship not found' error)
    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('date', { ascending: false })

    if (filters?.search) {
      query = query.ilike('invoice_number', `%${filters.search}%`)
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId)
    }

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Manual join for customers since Supabase relationship is not working
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, customer_number')
      .eq('company_id', companyId)

    const customerMap = new Map((customers || []).map(c => [c.id, {
      id: c.id,
      name: c.name,
      customerNumber: c.customer_number
    }]))

    const invoicesWithCustomer = (data || []).map(row => {
      const mapped = mapInvoiceFromDb(row)
      mapped.customer = customerMap.get(row.customer_id) || null
      return mapped
    })

    return {
      success: true,
      data: {
        invoices: invoicesWithCustomer,
        total: count || 0
      }
    }
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get single invoice with items
 */
export async function getInvoice(id: string): Promise<ActionResult<InvoiceWithCustomer>> {
  try {
    // Fetch invoice only (joining removed to fix Supabase 'relationship not found' error)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return { success: false, error: 'Invoice not found' }

    // Fetch items separately
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)

    // Fetch customer separately
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, customer_number')
      .eq('id', data.customer_id)
      .maybeSingle()

    const mapped = mapInvoiceFromDb(data)
    mapped.customer = customer ? {
      id: customer.id,
      name: customer.name,
      customerNumber: customer.customer_number
    } : null

    // Attach items
    if (items) {
      mapped.items = items.map((item: any) => ({
        id: item.id,
        invoiceId: item.invoice_id,
        itemId: item.item_id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        taxRate: item.tax_rate,
        total: item.total
      }))
    }

    return { success: true, data: mapped }
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Create a new invoice with items
 */
export async function createInvoice(
  companyId: string,
  data: InvoiceFormValues
): Promise<ActionResult<InvoiceWithCustomer>> {
  try {
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(data.items)
    const invoiceNumber = await generateInvoiceNumber(companyId)
    // Generate ID upfront to be resilient to RLS select failures
    const invoiceId = crypto.randomUUID()

    // Insert invoice
    console.log('[createInvoice] Inserting invoice:', invoiceId, 'for customer:', data.customerId)

    // Check Credit Limit (Peachtree Logic)
    if (data.status !== 'DRAFT') {
      const { data: customer } = await supabase
        .from('customers')
        .select('credit_limit, balance')
        .eq('id', data.customerId)
        .single()

      if (customer && customer.credit_limit && customer.credit_limit > 0) {
        const currentBalance = Number(customer.balance || 0)
        // Note: If customer balance is already over limit, any new invoice is blocked.
        if (currentBalance + total > customer.credit_limit) {
          return {
            success: false,
            error: `Credit limit exceeded. Current balance: ${currentBalance}, Limit: ${customer.credit_limit}, Invoice: ${total}`
          }
        }
      }
    }

    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        id: invoiceId,
        company_id: companyId,
        customer_id: data.customerId,
        invoice_number: invoiceNumber,
        date: data.date.toISOString(),
        due_date: data.dueDate.toISOString(),
        subtotal,
        tax_amount: taxAmount,
        discount_amount: data.discountAmount || 0,
        total,
        status: data.status || 'DRAFT',
        notes: data.notes,
        terms: data.terms,
        sales_rep_id: data.salesRepId,
        po_number: data.poNumber,
        ship_method: data.shipMethod,
        ship_date: data.shipDate ? new Date(data.shipDate).toISOString() : null,
        ship_address: data.shipAddress,
        drop_ship: data.dropShip || false,
      })
      .select()
      .maybeSingle() // Use maybeSingle to avoid 406 error if RLS blocks select

    if (invoiceError) {
      console.error("[createInvoice] Database error:", invoiceError)
      throw invoiceError
    }

    // Insert invoice items
    if (data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        id: crypto.randomUUID(),
        invoice_id: invoiceId,
        item_id: item.itemId || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || 0,
        total: item.quantity * item.unitPrice * (1 + (item.taxRate || 0))
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error("Error inserting invoice items:", itemsError)
        // Continue - invoice was created, items failed
      }
    }

    // Update customer balance if invoice is not draft
    if (data.status !== 'DRAFT') {
      await updateCustomerBalance(data.customerId, total)

      // Update inventory stock
      if (data.items.length > 0) {
        console.log('[createInvoice] Deducting stock for items...')
        for (const item of data.items) {
          if (item.itemId) {
            await updateItemStock(item.itemId, -item.quantity)
          }
        }
      }
    }

    // Final verify of totals to prevent NaN
    const safeSubtotal = isNaN(subtotal) ? 0 : subtotal
    const safeTax = isNaN(taxAmount) ? 0 : taxAmount
    const safeTotal = isNaN(total) ? 0 : total

    const finalInvoice = newInvoice || {
      id: invoiceId,
      invoice_number: invoiceNumber,
      customer_id: data.customerId,
      date: data.date.toISOString(),
      due_date: data.dueDate.toISOString(),
      subtotal: safeSubtotal.toString(),
      tax_amount: safeTax.toString(),
      total: safeTotal.toString(),
      status: data.status || 'DRAFT',
      notes: data.notes,
      terms: data.terms,
      invoice_items: data.items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unit_price: item.unitPrice.toString(),
        tax_rate: item.taxRate.toString(),
        total: (item.quantity * item.unitPrice * (1 + (item.taxRate || 0))).toString()
      }))
    }

    console.log('[createInvoice] SUCCESS: Invoice created with ID:', invoiceId)
    return { success: true, data: mapInvoiceFromDb(finalInvoice) }
  } catch (error) {
    console.error("Error creating invoice:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Update an existing invoice with balance reversal logic
 */
export async function updateInvoice(
  id: string,
  data: InvoiceFormValues
): Promise<ActionResult<InvoiceWithCustomer>> {
  try {
    // ============ PEACHTREE LOGIC: Fetch current invoice for balance reversal ============
    const { data: oldInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, invoice_items(item_id, quantity)')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!oldInvoice) throw new Error('Invoice not found')

    if (oldInvoice.status === 'PAID' || oldInvoice.status === 'SENT') {
      return { success: false, error: 'Cannot edit an invoice that has been Sent or Paid. Please Cancel it instead.' }
    }

    const { subtotal, taxAmount, total } = calculateInvoiceTotals(data.items)
    const oldTotal = Number(oldInvoice.total) || 0
    const newTotal = total
    const totalDiff = newTotal - oldTotal

    // ============ Handle Customer Balance Changes ============
    const wasNonDraft = oldInvoice.status !== 'DRAFT'
    const isNonDraft = data.status !== 'DRAFT'

    if (oldInvoice.customer_id === data.customerId) {
      // Same customer - adjust balance by difference if status is not DRAFT
      if (wasNonDraft && isNonDraft && totalDiff !== 0) {
        await updateCustomerBalance(data.customerId, totalDiff)
        console.log(`[updateInvoice] Customer ${data.customerId} balance adjusted by ${totalDiff}`)
      } else if (!wasNonDraft && isNonDraft) {
        // Moving from DRAFT to non-DRAFT
        await updateCustomerBalance(data.customerId, newTotal)
        console.log(`[updateInvoice] Customer ${data.customerId} balance increased by ${newTotal} (DRAFT -> active)`)
      } else if (wasNonDraft && !isNonDraft) {
        // Moving from non-DRAFT to DRAFT (unusual but handle it)
        await updateCustomerBalance(oldInvoice.customer_id, -oldTotal)
        console.log(`[updateInvoice] Customer ${data.customerId} balance reduced by ${oldTotal} (active -> DRAFT)`)
      }
    } else {
      // Different customer - reverse from old, apply to new
      if (wasNonDraft) {
        await updateCustomerBalance(oldInvoice.customer_id, -oldTotal)
        console.log(`[updateInvoice] Old customer ${oldInvoice.customer_id} balance reduced by ${oldTotal}`)
      }
      if (isNonDraft) {
        await updateCustomerBalance(data.customerId, newTotal)
        console.log(`[updateInvoice] New customer ${data.customerId} balance increased by ${newTotal}`)
      }
    }

    // ============ Handle Inventory Changes ============
    // If status changed, handle inventory accordingly
    if (wasNonDraft) {
      // Return old items to stock
      if (oldInvoice.invoice_items && oldInvoice.invoice_items.length > 0) {
        for (const item of oldInvoice.invoice_items) {
          if (item.item_id) {
            await updateItemStock(item.item_id, Number(item.quantity))
          }
        }
      }
    }

    // Update invoice
    const { data: updated, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        customer_id: data.customerId,
        date: data.date.toISOString(),
        due_date: data.dueDate.toISOString(),
        subtotal,
        tax_amount: taxAmount,
        discount_amount: data.discountAmount || 0,
        total,
        status: data.status,
        notes: data.notes,
        terms: data.terms,
        sales_rep_id: data.salesRepId,
        po_number: data.poNumber,
        ship_method: data.shipMethod,
        ship_date: data.shipDate ? new Date(data.shipDate).toISOString() : null,
        ship_address: data.shipAddress,
        drop_ship: data.dropShip,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (invoiceError) {
      console.error("[updateInvoice] Database error:", invoiceError)
      throw invoiceError
    }

    // Replace items - delete old, insert new
    await supabase.from('invoice_items').delete().eq('invoice_id', id)

    if (data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        id: crypto.randomUUID(),
        invoice_id: id,
        item_id: item.itemId || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || 0,
        total: item.quantity * item.unitPrice * (1 + (item.taxRate || 0))
      }))

      await supabase.from('invoice_items').insert(itemsToInsert)
    }

    // Deduct new items from stock if non-DRAFT
    if (isNonDraft && data.items.length > 0) {
      for (const item of data.items) {
        if (item.itemId) {
          await updateItemStock(item.itemId, -item.quantity)
        }
      }
    }

    return { success: true, data: mapInvoiceFromDb(updated) }
  } catch (error) {
    console.error("Error updating invoice:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<ActionResult<void>> {
  try {
    // 1. Get current status and items to handle inventory
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('status, invoice_items(item_id, quantity)')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const currentStatus = invoice.status
    const targetStatus = status

    // 2. Handle Inventory Logic
    // If moving FROM Draft/Estimate TO Final (Sent/Paid) -> DEDUCT Stock
    const isBecomingFinal = (currentStatus === 'DRAFT' || currentStatus === 'ESTIMATE') && (targetStatus === 'SENT' || targetStatus === 'PAID' || targetStatus === 'PARTIALLY_PAID')

    // If moving FROM Final TO Cancelled/Draft -> RETURN Stock
    const isReversing = (currentStatus === 'SENT' || currentStatus === 'PAID' || currentStatus === 'PARTIALLY_PAID') && (targetStatus === 'CANCELLED' || targetStatus === 'DRAFT')

    if (invoice.invoice_items && invoice.invoice_items.length > 0) {
      if (isBecomingFinal) {
        console.log(`[updateStatus] Deducting stock for invoice ${id}`)
        for (const item of invoice.invoice_items) {
          if (item.item_id) await updateItemStock(item.item_id, -Number(item.quantity))
        }
      } else if (isReversing) {
        console.log(`[updateStatus] Returning stock for invoice ${id}`)
        for (const item of invoice.invoice_items) {
          if (item.item_id) await updateItemStock(item.item_id, Number(item.quantity))
        }
      }
    }

    // 3. Update Status
    const { error } = await supabase
      .from('invoices')
      .update({ status, updated_at: new Date() })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Cancel an invoice
 */
export async function cancelInvoice(id: string): Promise<ActionResult<void>> {
  return updateInvoiceStatus(id, 'CANCELLED')
}

/**
 * Delete an invoice permanently with balance reversal
 */
export async function deleteInvoice(id: string): Promise<ActionResult<void>> {
  try {
    // ============ PEACHTREE LOGIC: Reverse balance before deletion ============

    // Fetch invoice first to get details
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, invoice_items(item_id, quantity)')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!invoice) throw new Error('Invoice not found')

    // Reverse customer balance if invoice was not DRAFT
    if (invoice.status !== 'DRAFT') {
      // Subtract the unpaid portion from customer balance
      const unpaidAmount = Number(invoice.total) - Number(invoice.paid_amount || 0)
      if (unpaidAmount > 0) {
        await updateCustomerBalance(invoice.customer_id, -unpaidAmount)
        console.log(`[deleteInvoice] Customer ${invoice.customer_id} balance reduced by ${unpaidAmount}`)
      }

      // Return inventory stock
      if (invoice.invoice_items && invoice.invoice_items.length > 0) {
        console.log(`[deleteInvoice] Returning stock for invoice ${id}`)
        for (const item of invoice.invoice_items) {
          if (item.item_id) {
            await updateItemStock(item.item_id, Number(item.quantity))
          }
        }
      }
    }

    // Note: invoice_items has ON DELETE CASCADE in schema
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Record a payment against an invoice
 */
export async function recordInvoicePayment(
  invoiceId: string,
  amount: number,
  paymentMethod: string,
  reference?: string
): Promise<ActionResult<void>> {
  try {
    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('total, paid_amount, customer_id, company_id')
      .eq('id', invoiceId)
      .single()

    if (fetchError) throw fetchError

    const newPaidAmount = Number(invoice.paid_amount) + amount
    const newStatus: InvoiceStatus = newPaidAmount >= Number(invoice.total)
      ? 'PAID'
      : 'PARTIALLY_PAID'

    // Update invoice
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        updated_at: new Date(),
      })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    // Record payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        company_id: invoice.company_id,
        customer_id: invoice.customer_id,
        invoice_id: invoiceId,
        amount,
        payment_date: new Date(),
        payment_method: paymentMethod,
        reference,
      })

    if (paymentError) throw paymentError

    // Update customer balance
    await updateCustomerBalance(invoice.customer_id, -amount)

    return { success: true }
  } catch (error) {
    console.error("Error recording payment:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Helper to update customer balance
 */
async function updateCustomerBalance(customerId: string, amountDelta: number): Promise<void> {
  const { data: customer } = await supabase
    .from('customers')
    .select('balance')
    .eq('id', customerId)
    .single()

  if (customer) {
    const newBalance = Number(customer.balance) + amountDelta
    await supabase
      .from('customers')
      .update({ balance: newBalance, updated_at: new Date() })
      .eq('id', customerId)
  }
}

/**
 * Get customers for dropdown (active only)
 */
export async function getCustomersForDropdown(companyId: string): Promise<ActionResult<Array<{
  id: string
  name: string
  creditLimit: number | null
  balance: number | null
  paymentTerms: string | null
}>>> {
  try {
    const { data } = await supabase
      .from('customers')
      .select('id, name, credit_limit, balance, payment_terms')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')

    return {
      success: true,
      data: (data || []).map(c => ({
        id: c.id,
        name: c.name,
        creditLimit: c.credit_limit ? Number(c.credit_limit) : null,
        balance: c.balance ? Number(c.balance) : null,
        paymentTerms: c.payment_terms,
      }))
    }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get items for dropdown (active only)
 */
export async function getItemsForDropdown(companyId: string): Promise<ActionResult<Array<{
  id: string
  name: string
  sku: string
  sellingPrice: string
}>>> {
  try {
    const { data } = await supabase
      .from('items')
      .select('id, name, sku, selling_price')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')

    return {
      success: true,
      data: (data || []).map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        sellingPrice: item.selling_price,
      }))
    }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get invoice summary stats
 */
export async function getInvoicesSummary(companyId: string): Promise<ActionResult<{
  total: number
  draft: number
  sent: number
  paid: number
  overdue: number
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
}>> {
  try {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('status, total, paid_amount')
      .eq('company_id', companyId)

    if (!invoices) {
      return {
        success: true,
        data: {
          total: 0,
          draft: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
          totalAmount: 0,
          paidAmount: 0,
          outstandingAmount: 0,
        }
      }
    }

    const stats = invoices.reduce(
      (acc, inv) => {
        acc.total++
        acc.totalAmount += Number(inv.total) || 0
        acc.paidAmount += Number(inv.paid_amount) || 0

        switch (inv.status) {
          case 'DRAFT': acc.draft++; break
          case 'SENT': acc.sent++; break
          case 'PAID': acc.paid++; break
          case 'OVERDUE': acc.overdue++; break
        }
        return acc
      },
      { total: 0, draft: 0, sent: 0, paid: 0, overdue: 0, totalAmount: 0, paidAmount: 0 }
    )

    return {
      success: true,
      data: {
        ...stats,
        outstandingAmount: stats.totalAmount - stats.paidAmount,
      }
    }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}
