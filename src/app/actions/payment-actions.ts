'use server'

import { db } from '@/db'
import { payments, invoices, customers } from '@/db/schema'
import { eq, and, ilike, gte, lte, inArray, desc, asc, count, sql } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  paymentSchema,
  paymentFiltersSchema,
  type PaymentFormValues,
  type PaymentFiltersValues,
} from '@/lib/validations/payment'
import { revalidatePath } from 'next/cache'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get list of payments with filters and pagination
 */
export async function getPayments(
  filters?: Partial<PaymentFiltersValues>
): Promise<ActionResult<{ payments: any[]; total: number }>> {
  try {
    const companyId = await getCurrentCompanyId()

    const validatedFilters = paymentFiltersSchema.parse(filters || {})

    // Build where conditions
    const conditions = [eq(payments.companyId, companyId)]

    if (validatedFilters.customerId) {
      conditions.push(eq(payments.customerId, validatedFilters.customerId))
    }

    if (validatedFilters.invoiceId) {
      conditions.push(eq(payments.invoiceId, validatedFilters.invoiceId))
    }

    if (validatedFilters.paymentMethod) {
      conditions.push(eq(payments.paymentMethod, validatedFilters.paymentMethod))
    }

    if (validatedFilters.dateFrom) {
      conditions.push(gte(payments.paymentDate, validatedFilters.dateFrom))
    }

    if (validatedFilters.dateTo) {
      conditions.push(lte(payments.paymentDate, validatedFilters.dateTo))
    }

    if (validatedFilters.search) {
      const searchTerm = `%${validatedFilters.search}%`
      conditions.push(ilike(payments.reference, searchTerm))
    }

    const whereClause = and(...conditions)

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(payments)
      .where(whereClause)

    // Build orderBy - use a type-safe column map
    const sortableColumns = {
      id: payments.id,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      reference: payments.reference,
      createdAt: payments.createdAt,
    } as const

    const sortField = validatedFilters.sortBy || 'createdAt'
    const sortOrder = validatedFilters.sortOrder || 'desc'
    const orderByColumn = sortableColumns[sortField as keyof typeof sortableColumns] ?? payments.createdAt
    const orderBy = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)

    // Get payments with relations
    const limit = validatedFilters.limit || 20
    const page = validatedFilters.page || 1
    const offset = (page - 1) * limit

    const paymentList = await db.query.payments.findMany({
      where: whereClause,
      orderBy,
      limit,
      offset,
      with: {
        customer: {
          columns: { id: true, name: true },
        },
        invoice: {
          columns: { id: true, invoiceNumber: true, total: true },
        },
      },
    })

    return {
      success: true,
      data: { payments: paymentList, total },
    }
  } catch (error) {
    console.error('Error fetching payments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payments',
    }
  }
}

/**
 * Get a single payment by ID
 */
export async function getPayment(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const payment = await db.query.payments.findFirst({
      where: and(eq(payments.id, id), eq(payments.companyId, companyId)),
      with: {
        customer: {
          columns: { id: true, name: true, email: true, phone: true },
        },
        invoice: {
          columns: { id: true, invoiceNumber: true, total: true, paidAmount: true },
        },
      },
    })

    if (!payment) {
      return { success: false, error: 'Payment not found' }
    }

    return { success: true, data: payment }
  } catch (error) {
    console.error('Error fetching payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment',
    }
  }
}

/**
 * Record a new payment
 */
export async function createPayment(
  data: PaymentFormValues
): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const validatedData = paymentSchema.parse(data)

    const payment = await db.transaction(async (tx) => {
      // Create the payment
      const [newPayment] = await tx
        .insert(payments)
        .values({
          companyId,
          customerId: validatedData.customerId,
          invoiceId: validatedData.invoiceId || null,
          amount: String(validatedData.amount),
          paymentDate: validatedData.paymentDate,
          paymentMethod: validatedData.paymentMethod,
          reference: validatedData.reference || null,
          notes: validatedData.notes || null,
        })
        .returning()

      // If linked to an invoice, update the invoice paid amount
      if (validatedData.invoiceId) {
        const invoice = await tx.query.invoices.findFirst({
          where: eq(invoices.id, validatedData.invoiceId),
          columns: { paidAmount: true, total: true },
        })

        if (invoice) {
          const newPaidAmount = Number(invoice.paidAmount) + validatedData.amount
          const total = Number(invoice.total)

          // Determine new status based on payment
          let newStatus: 'PARTIALLY_PAID' | 'PAID' = 'PARTIALLY_PAID'
          if (newPaidAmount >= total) {
            newStatus = 'PAID'
          }

          await tx
            .update(invoices)
            .set({
              paidAmount: String(newPaidAmount),
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, validatedData.invoiceId))
        }
      }

      // Update customer balance (decrement by payment amount)
      console.log('[Payment] Updating customer balance:', {
        customerId: validatedData.customerId,
        paymentAmount: validatedData.amount,
        action: 'balance - amount'
      })

      await tx
        .update(customers)
        .set({
          balance: sql`${customers.balance} - ${validatedData.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, validatedData.customerId))

      console.log('[Payment] Customer balance updated successfully')

      return newPayment
    })

    revalidatePath('/dashboard/payments')
    if (validatedData.invoiceId) {
      revalidatePath(`/dashboard/invoices/${validatedData.invoiceId}`)
    }
    revalidatePath('/dashboard/invoices')

    return { success: true, data: payment }
  } catch (error) {
    console.error('Error creating payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record payment',
    }
  }
}

/**
 * Update an existing payment
 */
export async function updatePayment(
  id: string,
  data: PaymentFormValues
): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const validatedData = paymentSchema.parse(data)

    // Get the existing payment
    const existingPayment = await db.query.payments.findFirst({
      where: and(eq(payments.id, id), eq(payments.companyId, companyId)),
    })

    if (!existingPayment) {
      return { success: false, error: 'Payment not found' }
    }

    const payment = await db.transaction(async (tx) => {
      const oldAmount = Number(existingPayment.amount)
      const newAmount = validatedData.amount
      const amountDiff = newAmount - oldAmount

      // Update the payment
      const [updatedPayment] = await tx
        .update(payments)
        .set({
          customerId: validatedData.customerId,
          invoiceId: validatedData.invoiceId || null,
          amount: String(validatedData.amount),
          paymentDate: validatedData.paymentDate,
          paymentMethod: validatedData.paymentMethod,
          reference: validatedData.reference || null,
          notes: validatedData.notes || null,
        })
        .where(eq(payments.id, id))
        .returning()

      // Handle invoice updates if linked
      if (validatedData.invoiceId === existingPayment.invoiceId && validatedData.invoiceId) {
        // Same invoice - just update the amount difference
        const invoice = await tx.query.invoices.findFirst({
          where: eq(invoices.id, validatedData.invoiceId),
          columns: { paidAmount: true, total: true },
        })

        if (invoice) {
          const newPaidAmount = Number(invoice.paidAmount) + amountDiff
          const total = Number(invoice.total)

          let newStatus: 'SENT' | 'PARTIALLY_PAID' | 'PAID' = 'SENT'
          if (newPaidAmount <= 0) {
            newStatus = 'SENT'
          } else if (newPaidAmount >= total) {
            newStatus = 'PAID'
          } else {
            newStatus = 'PARTIALLY_PAID'
          }

          await tx
            .update(invoices)
            .set({
              paidAmount: String(Math.max(0, newPaidAmount)),
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, validatedData.invoiceId))
        }
      }

      // Update customer balance (adjust by amount difference)
      if (amountDiff !== 0) {
        await tx
          .update(customers)
          .set({
            balance: sql`${customers.balance} - ${amountDiff}`,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, validatedData.customerId))
      }

      return updatedPayment
    })

    revalidatePath('/dashboard/payments')
    revalidatePath(`/dashboard/payments/${id}`)
    if (validatedData.invoiceId) {
      revalidatePath(`/dashboard/invoices/${validatedData.invoiceId}`)
    }
    revalidatePath('/dashboard/invoices')

    return { success: true, data: payment }
  } catch (error) {
    console.error('Error updating payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update payment',
    }
  }
}

/**
 * Delete a payment (and reverse invoice/customer updates)
 */
export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const payment = await db.query.payments.findFirst({
      where: and(eq(payments.id, id), eq(payments.companyId, companyId)),
      with: { invoice: true },
    })

    if (!payment) {
      return { success: false, error: 'Payment not found' }
    }

    await db.transaction(async (tx) => {
      // If linked to invoice, reverse the paid amount
      if (payment.invoiceId) {
        const invoice = await tx.query.invoices.findFirst({
          where: eq(invoices.id, payment.invoiceId),
          columns: { paidAmount: true },
        })

        if (invoice) {
          const newPaidAmount = Number(invoice.paidAmount) - Number(payment.amount)

          await tx
            .update(invoices)
            .set({
              paidAmount: String(Math.max(0, newPaidAmount)),
              status: newPaidAmount <= 0 ? 'SENT' : 'PARTIALLY_PAID',
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, payment.invoiceId))
        }
      }

      // Reverse customer balance update (increment by payment amount)
      await tx
        .update(customers)
        .set({
          balance: sql`${customers.balance} + ${Number(payment.amount)}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, payment.customerId))

      // Delete the payment
      await tx.delete(payments).where(eq(payments.id, id))
    })

    revalidatePath('/dashboard/payments')
    revalidatePath('/dashboard/invoices')

    return { success: true }
  } catch (error) {
    console.error('Error deleting payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete payment',
    }
  }
}

/**
 * Get unpaid invoices for a customer (for payment application)
 */
export async function getUnpaidInvoicesForCustomer(
  customerId: string
): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const unpaidInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.companyId, companyId),
        eq(invoices.customerId, customerId),
        inArray(invoices.status, ['SENT', 'PARTIALLY_PAID', 'OVERDUE'])
      ),
      columns: {
        id: true,
        invoiceNumber: true,
        date: true,
        dueDate: true,
        total: true,
        paidAmount: true,
      },
      orderBy: asc(invoices.dueDate),
    })

    return { success: true, data: unpaidInvoices }
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices',
    }
  }
}
