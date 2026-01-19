'use server'

import { db } from '@/db'
import { invoices, payments, customers, companies } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  initializePayment,
  verifyPayment,
  generateTxRef,
  parseTxRef,
  isChapaConfigured,
} from '@/lib/chapa'
import { revalidatePath } from 'next/cache'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Check if Chapa payments are available
 */
export async function checkChapaAvailability(): Promise<ActionResult<{ available: boolean }>> {
  return {
    success: true,
    data: { available: isChapaConfigured() },
  }
}

/**
 * Create a payment link for an invoice
 * Returns a Chapa checkout URL that can be shared with the customer
 */
export async function createPaymentLink(
  invoiceId: string
): Promise<ActionResult<{ checkoutUrl: string; txRef: string }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Get invoice with customer
    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, companyId)
      ),
      with: {
        customer: true,
      },
    })

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      }
    }

    if (!invoice.customer) {
      return {
        success: false,
        error: 'Customer not found for this invoice',
      }
    }

    if (['PAID', 'CANCELLED'].includes(invoice.status)) {
      return {
        success: false,
        error: 'Cannot create payment link for paid or cancelled invoice',
      }
    }

    // Get company info for customization
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    })

    // Calculate amount due
    const total = Number(invoice.total)
    const paidAmount = Number(invoice.paidAmount)
    const amountDue = total - paidAmount

    if (amountDue <= 0) {
      return {
        success: false,
        error: 'Invoice is already fully paid',
      }
    }

    // Generate unique transaction reference
    const txRef = generateTxRef(invoice.invoiceNumber)

    // Get base URL for callbacks
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Initialize Chapa payment
    const result = await initializePayment({
      amount: amountDue,
      currency: 'ETB',
      email: invoice.customer.email || 'customer@example.com',
      firstName: invoice.customer.name.split(' ')[0],
      lastName: invoice.customer.name.split(' ').slice(1).join(' ') || undefined,
      phoneNumber: invoice.customer.phone || undefined,
      txRef,
      callbackUrl: `${baseUrl}/api/payments/chapa/callback`,
      returnUrl: `${baseUrl}/dashboard/invoices/${invoiceId}?payment=success`,
      customization: {
        title: company?.name || 'Invoice Payment',
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
      },
      meta: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        companyId,
      },
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create payment link',
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    console.error('Error creating payment link:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment link',
    }
  }
}

/**
 * Verify and process a Chapa payment
 * Called after webhook notification or manual verification
 */
export async function processPayment(
  txRef: string
): Promise<ActionResult<{ paymentId: string }>> {
  try {
    // Verify payment with Chapa
    const verifyResult = await verifyPayment(txRef)

    if (!verifyResult.success || !verifyResult.data) {
      return {
        success: false,
        error: verifyResult.error || 'Payment verification failed',
      }
    }

    const paymentData = verifyResult.data

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return {
        success: false,
        error: `Payment status: ${paymentData.status}`,
      }
    }

    // Parse transaction reference to get invoice info
    const txInfo = parseTxRef(txRef)
    if (!txInfo) {
      return {
        success: false,
        error: 'Invalid transaction reference',
      }
    }

    // Get invoice by invoice number
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.invoiceNumber, txInfo.invoiceNumber),
    })

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      }
    }

    // Check if payment already recorded (prevent duplicates)
    const existingPayment = await db.query.payments.findFirst({
      where: eq(payments.reference, txRef),
    })

    if (existingPayment) {
      return {
        success: true,
        data: { paymentId: existingPayment.id },
      }
    }

    // Record payment in database
    const [payment] = await db.transaction(async (tx) => {
      // Create payment record
      const [newPayment] = await tx
        .insert(payments)
        .values({
          companyId: invoice.companyId,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          amount: String(paymentData.amount),
          paymentDate: new Date(),
          paymentMethod: 'chapa',
          reference: txRef,
          notes: `Chapa payment via ${paymentData.method || 'mobile money'}`,
        })
        .returning()

      // Update invoice paid amount and status
      const newPaidAmount = Number(invoice.paidAmount) + paymentData.amount
      const total = Number(invoice.total)
      const newStatus = newPaidAmount >= total ? 'PAID' : 'PARTIALLY_PAID'

      await tx
        .update(invoices)
        .set({
          paidAmount: String(newPaidAmount),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id))

      // Update customer balance
      await tx
        .update(customers)
        .set({
          balance: sql`${customers.balance} - ${paymentData.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, invoice.customerId))

      return [newPayment]
    })

    // Revalidate paths
    revalidatePath('/dashboard/invoices')
    revalidatePath(`/dashboard/invoices/${invoice.id}`)
    revalidatePath('/dashboard/payments')

    return {
      success: true,
      data: { paymentId: payment.id },
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process payment',
    }
  }
}

/**
 * Get payment status for a transaction
 */
export async function getPaymentStatus(
  txRef: string
): Promise<ActionResult<{ status: string; amount?: number; method?: string }>> {
  try {
    const verifyResult = await verifyPayment(txRef)

    if (!verifyResult.success || !verifyResult.data) {
      return {
        success: false,
        error: verifyResult.error || 'Failed to get payment status',
      }
    }

    return {
      success: true,
      data: {
        status: verifyResult.data.status,
        amount: verifyResult.data.amount,
        method: verifyResult.data.method,
      },
    }
  } catch (error) {
    console.error('Error getting payment status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment status',
    }
  }
}
