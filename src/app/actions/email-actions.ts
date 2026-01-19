'use server'

import { db } from '@/db'
import { invoices, customers, companies } from '@/db/schema'
import { eq, and, lt, notInArray } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { sendInvoiceEmail, sendPaymentReminder } from '@/lib/email'
import { formatCurrency, formatDate } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Send an invoice email to a customer
 * Optionally includes PDF attachment
 */
export async function sendInvoiceEmailAction(
  invoiceId: string,
  includePdf: boolean = true
): Promise<ActionResult<{ messageId?: string }>> {
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
        items: true,
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

    if (!invoice.customer.email) {
      return {
        success: false,
        error: 'Customer does not have an email address',
      }
    }

    // Get company info
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    })

    if (!company) {
      return {
        success: false,
        error: 'Company not found',
      }
    }

    // Generate PDF if requested
    let pdfBuffer: Buffer | undefined

    if (includePdf) {
      // Dynamic import to avoid issues with server-side rendering
      const { generateInvoicePdfBuffer } = await import('./invoice-pdf-server')
      const pdfResult = await generateInvoicePdfBuffer(invoiceId)

      if (pdfResult.success && pdfResult.data) {
        pdfBuffer = pdfResult.data
      }
    }

    // Calculate amount due
    const total = Number(invoice.total)
    const paidAmount = Number(invoice.paidAmount)
    const amountDue = total - paidAmount

    // Send the email
    const result = await sendInvoiceEmail({
      to: invoice.customer.email,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(amountDue),
      dueDate: formatDate(invoice.dueDate),
      companyName: company.name,
      companyEmail: company.email,
      pdfBuffer,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send email',
      }
    }

    // Update invoice status to SENT if it was DRAFT
    if (invoice.status === 'DRAFT') {
      await db
        .update(invoices)
        .set({ status: 'SENT', updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId))

      revalidatePath('/dashboard/invoices')
      revalidatePath(`/dashboard/invoices/${invoiceId}`)
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    }
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Send payment reminder for overdue invoice
 */
export async function sendPaymentReminderAction(
  invoiceId: string
): Promise<ActionResult<{ messageId?: string }>> {
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

    if (!invoice.customer?.email) {
      return {
        success: false,
        error: 'Customer does not have an email address',
      }
    }

    // Check if invoice is overdue
    const dueDate = new Date(invoice.dueDate)
    const today = new Date()
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOverdue <= 0) {
      return {
        success: false,
        error: 'Invoice is not overdue',
      }
    }

    // Get company info
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    })

    if (!company) {
      return {
        success: false,
        error: 'Company not found',
      }
    }

    // Calculate amount due
    const total = Number(invoice.total)
    const paidAmount = Number(invoice.paidAmount)
    const amountDue = total - paidAmount

    // Send the reminder
    const result = await sendPaymentReminder({
      to: invoice.customer.email,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(amountDue),
      dueDate: formatDate(invoice.dueDate),
      daysOverdue,
      companyName: company.name,
      companyEmail: company.email,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send reminder',
      }
    }

    // Update status to OVERDUE if not already
    if (invoice.status !== 'OVERDUE' && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED') {
      await db
        .update(invoices)
        .set({ status: 'OVERDUE', updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId))

      revalidatePath('/dashboard/invoices')
      revalidatePath(`/dashboard/invoices/${invoiceId}`)
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    }
  } catch (error) {
    console.error('Error sending payment reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminder',
    }
  }
}

/**
 * Get list of overdue invoices that need reminders
 */
export async function getOverdueInvoices(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const today = new Date()

    const overdueInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.companyId, companyId),
        lt(invoices.dueDate, today),
        notInArray(invoices.status, ['PAID', 'CANCELLED'])
      ),
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (invoices, { asc }) => [asc(invoices.dueDate)],
    })

    // Add days overdue calculation
    const enrichedInvoices = overdueInvoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        ...invoice,
        daysOverdue,
      }
    })

    return {
      success: true,
      data: enrichedInvoices,
    }
  } catch (error) {
    console.error('Error fetching overdue invoices:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch overdue invoices',
    }
  }
}

/**
 * Send reminders to all overdue invoices
 */
export async function sendBulkPaymentReminders(): Promise<ActionResult<{ sent: number; failed: number }>> {
  try {
    const overdueResult = await getOverdueInvoices()

    if (!overdueResult.success || !overdueResult.data) {
      return {
        success: false,
        error: overdueResult.error || 'Failed to fetch overdue invoices',
      }
    }

    let sent = 0
    let failed = 0

    for (const invoice of overdueResult.data) {
      if (invoice.customer?.email) {
        const result = await sendPaymentReminderAction(invoice.id)
        if (result.success) {
          sent++
        } else {
          failed++
        }
      } else {
        failed++ // No email address
      }
    }

    return {
      success: true,
      data: { sent, failed },
    }
  } catch (error) {
    console.error('Error sending bulk reminders:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminders',
    }
  }
}
