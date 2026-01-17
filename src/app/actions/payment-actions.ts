'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  paymentSchema,
  paymentFiltersSchema,
  type PaymentFormValues,
  type PaymentFiltersValues,
} from '@/lib/validations/payment'
import { Prisma } from '@prisma/client'
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

    const where: Prisma.PaymentWhereInput = {
      companyId,
      ...(validatedFilters.customerId && { customerId: validatedFilters.customerId }),
      ...(validatedFilters.invoiceId && { invoiceId: validatedFilters.invoiceId }),
      ...(validatedFilters.paymentMethod && { paymentMethod: validatedFilters.paymentMethod }),
      ...(validatedFilters.dateFrom && { paymentDate: { gte: validatedFilters.dateFrom } }),
      ...(validatedFilters.dateTo && { paymentDate: { lte: validatedFilters.dateTo } }),
      ...(validatedFilters.search && {
        OR: [
          { reference: { contains: validatedFilters.search, mode: 'insensitive' } },
          { customer: { name: { contains: validatedFilters.search, mode: 'insensitive' } } },
        ],
      }),
    }

    const orderBy: Prisma.PaymentOrderByWithRelationInput = {
      [validatedFilters.sortBy || 'createdAt']: validatedFilters.sortOrder || 'desc',
    }

    const total = await prisma.payment.count({ where })

    const payments = await prisma.payment.findMany({
      where,
      orderBy,
      skip: ((validatedFilters.page || 1) - 1) * (validatedFilters.limit || 20),
      take: validatedFilters.limit || 20,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, total: true },
        },
      },
    })

    return {
      success: true,
      data: { payments, total },
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

    const payment = await prisma.payment.findUnique({
      where: { id, companyId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, total: true, paidAmount: true },
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

    const payment = await prisma.$transaction(async (tx) => {
      // Create the payment
      const newPayment = await tx.payment.create({
        data: {
          companyId,
          customerId: validatedData.customerId,
          invoiceId: validatedData.invoiceId || null,
          amount: validatedData.amount,
          paymentDate: validatedData.paymentDate,
          paymentMethod: validatedData.paymentMethod,
          reference: validatedData.reference || null,
          notes: validatedData.notes || null,
        },
      })

      // If linked to an invoice, update the invoice paid amount
      if (validatedData.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: validatedData.invoiceId },
          select: { paidAmount: true, total: true },
        })

        if (invoice) {
          const newPaidAmount = invoice.paidAmount.toNumber() + validatedData.amount
          const total = invoice.total.toNumber()

          // Determine new status based on payment
          let newStatus = 'PARTIALLY_PAID'
          if (newPaidAmount >= total) {
            newStatus = 'PAID'
          }

          await tx.invoice.update({
            where: { id: validatedData.invoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus as any,
            },
          })
        }
      }

      // Update customer balance
      await tx.customer.update({
        where: { id: validatedData.customerId },
        data: {
          balance: {
            decrement: validatedData.amount,
          },
        },
      })

      return newPayment
    })

    revalidatePath('/payments')
    if (validatedData.invoiceId) {
      revalidatePath(`/invoices/${validatedData.invoiceId}`)
    }
    revalidatePath('/invoices')

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
 * Delete a payment (and reverse invoice/customer updates)
 */
export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const payment = await prisma.payment.findUnique({
      where: { id, companyId },
      include: { invoice: true },
    })

    if (!payment) {
      return { success: false, error: 'Payment not found' }
    }

    await prisma.$transaction(async (tx) => {
      // If linked to invoice, reverse the paid amount
      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
          select: { paidAmount: true },
        })

        if (invoice) {
          const newPaidAmount = invoice.paidAmount.toNumber() - payment.amount.toNumber()

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: Math.max(0, newPaidAmount),
              status: newPaidAmount <= 0 ? 'SENT' : 'PARTIALLY_PAID',
            },
          })
        }
      }

      // Reverse customer balance update
      await tx.customer.update({
        where: { id: payment.customerId },
        data: {
          balance: {
            increment: payment.amount.toNumber(),
          },
        },
      })

      // Delete the payment
      await tx.payment.delete({ where: { id } })
    })

    revalidatePath('/payments')
    revalidatePath('/invoices')

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

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        customerId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        dueDate: true,
        total: true,
        paidAmount: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    return { success: true, data: invoices }
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices',
    }
  }
}
