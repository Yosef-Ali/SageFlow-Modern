import { supabase } from "@/lib/supabase"
import { PaymentFormValues } from "@/lib/validations/payment"

// Import filters type if not already there, or use partial
import { PaymentFiltersValues } from "@/lib/validations/payment"

/**
 * Generate Peachtree-style receipt number
 * Format: REC-YYYYMM-XXXXX (e.g., REC-202601-00001)
 */
async function generateReceiptNumber(companyId: string): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `REC-${yearMonth}-`

  // Get the last receipt number for this month
  const { data } = await supabase
    .from('payments')
    .select('reference')
    .eq('company_id', companyId)
    .like('reference', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0 && data[0].reference) {
    const lastNumMatch = data[0].reference.match(/(\d+)$/)
    if (lastNumMatch) {
      nextNum = parseInt(lastNumMatch[1]) + 1
    }
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`
}

export async function getPayments(companyId: string, filters?: Partial<PaymentFiltersValues>) {
  try {
    // Fetch payments for this company
    let query = supabase
      .from('payments')
      .select('*')
      .eq('company_id', companyId)
      .order('payment_date', { ascending: false })

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId)
    }

    const { data: payments, error } = await query

    if (error) {
      console.error('Payments query error:', error)
      return { success: false, error: error.message }
    }

    if (!payments || payments.length === 0) {
      return { success: true, data: [] }
    }

    // Get unique customer IDs and invoice IDs
    const customerIds = [...new Set(payments.map(p => p.customer_id))]
    const invoiceIds = [...new Set(payments.filter(p => p.invoice_id).map(p => p.invoice_id))]

    // Fetch customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds)

    // Fetch invoices if any
    let invoices: any[] = []
    if (invoiceIds.length > 0) {
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, total')
        .in('id', invoiceIds)
      invoices = invoicesData || []
    }

    // Create lookup maps
    const customerMap = new Map(customers?.map(c => [c.id, c]) || [])
    const invoiceMap = new Map(invoices.map(i => [i.id, i]))

    // Transform payments with customer and invoice data
    const paymentsWithDetails = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      notes: payment.notes,
      customer: customerMap.get(payment.customer_id) || { id: payment.customer_id, name: 'Unknown' },
      invoice: payment.invoice_id ? (invoiceMap.get(payment.invoice_id) ? {
        id: payment.invoice_id,
        invoiceNumber: invoiceMap.get(payment.invoice_id)?.invoice_number,
        total: invoiceMap.get(payment.invoice_id)?.total
      } : null) : null
    }))

    return { success: true, data: paymentsWithDetails }
  } catch (error: any) {
    console.error("Error fetching payments:", error)
    return { success: false, error: error.message || "Failed to fetch payments" }
  }
}

export async function getPayment(id: string) {
  try {
    // Fetch payment without nested relations (FK not configured in Supabase)
    const { data, error } = await supabase.from('payments').select('*').eq('id', id).single()
    if (error) {
      console.error('Payment query error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching payment:", error)
    return { success: false, error: error.message || "Failed to fetch payment" }
  }
}

export async function createPayment(data: PaymentFormValues, companyId: string) {
  try {
    console.log('[createPayment] Starting with:', { data, companyId })

    // Generate Peachtree-style receipt number if no reference provided
    const receiptNumber = data.reference?.trim()
      ? data.reference.trim()
      : await generateReceiptNumber(companyId)

    // Determine invoice_id (handle 'none' and empty strings)
    const invoiceId = (!data.invoiceId || data.invoiceId === 'none' || data.invoiceId.trim() === '')
      ? null
      : data.invoiceId

    // Prepare payload - convert Date to ISO string for Supabase
    const payload = {
      id: crypto.randomUUID(),
      company_id: companyId,
      customer_id: data.customerId,
      invoice_id: invoiceId,
      amount: Number(data.amount),
      // Use timestampz format: convert Date to string
      payment_date: data.paymentDate instanceof Date
        ? data.paymentDate.toISOString()
        : new Date(data.paymentDate).toISOString(),
      payment_method: data.paymentMethod,
      reference: receiptNumber,
      notes: data.notes || null
    }

    console.log('[createPayment] Payload:', JSON.stringify(payload, null, 2))

    const { data: newPayment, error } = await supabase.from('payments').insert(payload).select().single()

    if (error) throw error

    // ============ PEACHTREE LOGIC: Update Customer Balance ============
    // Reduce customer balance by payment amount (payment reduces AR)
    const { data: customer } = await supabase
      .from('customers')
      .select('balance')
      .eq('id', data.customerId)
      .single()

    if (customer) {
      const newBalance = (Number(customer.balance) || 0) - Number(data.amount)
      await supabase
        .from('customers')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.customerId)
    }

    // ============ PEACHTREE LOGIC: Update Invoice Status ============
    if (invoiceId) {
      // Fetch invoice total and paid amount
      const { data: invoice } = await supabase
        .from('invoices')
        .select('total, paid_amount, status')
        .eq('id', invoiceId)
        .single()

      if (invoice) {
        const newPaidAmount = (Number(invoice.paid_amount) || 0) + Number(data.amount)
        const invoiceTotal = Number(invoice.total)

        // Peachtree-style status determination
        let newStatus: string
        if (newPaidAmount >= invoiceTotal) {
          newStatus = 'PAID'
        } else if (newPaidAmount > 0) {
          newStatus = 'PARTIALLY_PAID'
        } else {
          newStatus = invoice.status // Keep current status
        }

        await supabase.from('invoices').update({
          paid_amount: newPaidAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', invoiceId)

        console.log(`[createPayment] Invoice ${invoiceId} updated: paid=${newPaidAmount}, status=${newStatus}`)
      }
    }

    return { success: true, data: newPayment }
  } catch (error: any) {
    console.error("Error creating payment:", error)
    return { success: false, error: error.message || "Failed to create payment" }
  }
}

export async function updatePayment(id: string, data: PaymentFormValues) {
  try {
    // ============ PEACHTREE LOGIC: Reverse old payment effects first ============

    // Fetch the original payment
    const { data: oldPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!oldPayment) throw new Error('Payment not found')

    const oldAmount = Number(oldPayment.amount)
    const newAmount = Number(data.amount)
    const amountDiff = newAmount - oldAmount

    // Handle customer balance changes
    if (oldPayment.customer_id === data.customerId) {
      // Same customer - just adjust the difference
      if (amountDiff !== 0) {
        const { data: customer } = await supabase
          .from('customers')
          .select('balance')
          .eq('id', data.customerId)
          .single()

        if (customer) {
          // Subtract the difference (if payment increased, balance decreases more)
          const newBalance = (Number(customer.balance) || 0) - amountDiff
          await supabase
            .from('customers')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('id', data.customerId)
        }
      }
    } else {
      // Different customer - reverse from old, apply to new
      // Add back to old customer
      const { data: oldCustomer } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', oldPayment.customer_id)
        .single()

      if (oldCustomer) {
        const restoredBalance = (Number(oldCustomer.balance) || 0) + oldAmount
        await supabase
          .from('customers')
          .update({ balance: restoredBalance, updated_at: new Date().toISOString() })
          .eq('id', oldPayment.customer_id)
      }

      // Subtract from new customer
      const { data: newCustomer } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', data.customerId)
        .single()

      if (newCustomer) {
        const newBalance = (Number(newCustomer.balance) || 0) - newAmount
        await supabase
          .from('customers')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', data.customerId)
      }
    }

    // Handle invoice changes
    const newInvoiceId = (!data.invoiceId || data.invoiceId === 'none' || data.invoiceId.trim() === '')
      ? null
      : data.invoiceId

    // Reverse from old invoice if exists
    if (oldPayment.invoice_id) {
      const { data: oldInvoice } = await supabase
        .from('invoices')
        .select('total, paid_amount, due_date')
        .eq('id', oldPayment.invoice_id)
        .single()

      if (oldInvoice) {
        const restoredPaid = Math.max(0, (Number(oldInvoice.paid_amount) || 0) - oldAmount)
        const invoiceTotal = Number(oldInvoice.total)

        let newStatus: string
        if (restoredPaid >= invoiceTotal) {
          newStatus = 'PAID'
        } else if (restoredPaid > 0) {
          newStatus = 'PARTIALLY_PAID'
        } else {
          const dueDate = new Date(oldInvoice.due_date)
          newStatus = dueDate < new Date() ? 'OVERDUE' : 'SENT'
        }

        await supabase.from('invoices').update({
          paid_amount: restoredPaid,
          status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', oldPayment.invoice_id)
      }
    }

    // Apply to new invoice if exists
    if (newInvoiceId) {
      const { data: newInvoice } = await supabase
        .from('invoices')
        .select('total, paid_amount')
        .eq('id', newInvoiceId)
        .single()

      if (newInvoice) {
        const newPaidAmount = (Number(newInvoice.paid_amount) || 0) + newAmount
        const invoiceTotal = Number(newInvoice.total)

        let newStatus: string
        if (newPaidAmount >= invoiceTotal) {
          newStatus = 'PAID'
        } else if (newPaidAmount > 0) {
          newStatus = 'PARTIALLY_PAID'
        } else {
          newStatus = 'SENT'
        }

        await supabase.from('invoices').update({
          paid_amount: newPaidAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', newInvoiceId)
      }
    }

    // Update the payment record
    const { error } = await supabase.from('payments').update({
      customer_id: data.customerId,
      invoice_id: newInvoiceId,
      amount: newAmount,
      payment_date: data.paymentDate instanceof Date
        ? data.paymentDate.toISOString()
        : new Date(data.paymentDate).toISOString(),
      payment_method: data.paymentMethod,
      reference: data.reference || null,
      notes: data.notes || null
    }).eq('id', id)

    if (error) throw error
    return { success: true, data: { id } }
  } catch (error: any) {
    console.error("Error updating payment:", error)
    return { success: false, error: error.message || "Failed to update payment" }
  }
}

export async function deletePayment(id: string) {
  try {
    // ============ PEACHTREE LOGIC: Reverse payment effects before deletion ============

    // First, fetch the payment to get details
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!payment) throw new Error('Payment not found')

    // Reverse customer balance (add the payment amount back)
    const { data: customer } = await supabase
      .from('customers')
      .select('balance')
      .eq('id', payment.customer_id)
      .single()

    if (customer) {
      const restoredBalance = (Number(customer.balance) || 0) + Number(payment.amount)
      await supabase
        .from('customers')
        .update({
          balance: restoredBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.customer_id)
    }

    // Reverse invoice paid amount and status if linked
    if (payment.invoice_id) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('total, paid_amount, due_date')
        .eq('id', payment.invoice_id)
        .single()

      if (invoice) {
        const newPaidAmount = Math.max(0, (Number(invoice.paid_amount) || 0) - Number(payment.amount))
        const invoiceTotal = Number(invoice.total)

        // Determine new status
        let newStatus: string
        if (newPaidAmount >= invoiceTotal) {
          newStatus = 'PAID'
        } else if (newPaidAmount > 0) {
          newStatus = 'PARTIALLY_PAID'
        } else {
          // Check if overdue
          const dueDate = new Date(invoice.due_date)
          const today = new Date()
          newStatus = dueDate < today ? 'OVERDUE' : 'SENT'
        }

        await supabase.from('invoices').update({
          paid_amount: newPaidAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', payment.invoice_id)
      }
    }

    // Now delete the payment
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting payment:", error)
    return { success: false, error: error.message || "Failed to delete payment" }
  }
}

export async function getUnpaidInvoicesForCustomer(customerId: string) {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .neq('status', 'PAID') // OPEN, OVERDUE, PARTIALLY_PAID
      .order('due_date', { ascending: true })

    if (error) throw error
    return { success: true, data: invoices || [] }
  } catch (error) {
    return { success: false, error: "Failed to fetch invoices" }
  }
}
