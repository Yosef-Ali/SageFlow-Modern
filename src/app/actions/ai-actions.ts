'use server'

import { chatWithAI, autoScanInvoice, autoScanPayment, getFinancialInsights } from '@/lib/gemini-service'
import { logger } from '@/lib/logger'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { db } from '@/db'
import { companies, invoices, payments, customers } from '@/db/schema'
import { eq, inArray, desc, sum } from 'drizzle-orm'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Chat with AI Assistant
 */
export async function sendChatMessage(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ActionResult<{ response: string }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Get company context
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { name: true, currency: true },
    })

    // Get recent financial summary
    const [totalRevenueResult, totalExpensesResult, outstandingInvoicesResult] = await Promise.all([
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(eq(invoices.companyId, companyId)),
      db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.companyId, companyId)),
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(inArray(invoices.status, ['SENT', 'OVERDUE', 'PARTIALLY_PAID'])),
    ])

    const financialData = {
      revenue: Number(totalRevenueResult[0]?.total) || 0,
      expenses: Number(totalExpensesResult[0]?.total) || 0,
      outstandingInvoices: Number(outstandingInvoicesResult[0]?.total) || 0,
      currency: company?.currency || 'ETB',
    }

    const { response, error } = await chatWithAI(message, {
      conversationHistory,
      companyContext: `Company: ${company?.name}, Currency: ${company?.currency}`,
      financialData,
    })

    if (error) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
      data: { response },
    }
  } catch (error) {
    logger.error('AI chat error', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat message',
    }
  }
}

/**
 * Scan invoice/receipt image and extract data
 */
export async function scanInvoiceImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ActionResult<any>> {
  try {
    const result = await autoScanInvoice(imageBase64, mimeType)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to scan invoice',
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    logger.error('Invoice scan error', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan invoice',
    }
  }
}

/**
 * Scan payment receipt image and extract data
 */
export async function scanPaymentImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ActionResult<any>> {
  try {
    const result = await autoScanPayment(imageBase64, mimeType)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to scan payment receipt',
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    logger.error('Payment scan error', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan payment receipt',
    }
  }
}

/**
 * Get AI-generated financial insights
 */
export async function getAIInsights(): Promise<ActionResult<{ insights: string }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Gather financial data
    const [revenueResult, expenseResult, topCustomersList] = await Promise.all([
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(eq(invoices.companyId, companyId)),
      db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.companyId, companyId)),
      db.query.customers.findMany({
        where: eq(customers.companyId, companyId),
        orderBy: desc(customers.balance),
        limit: 5,
        columns: { name: true, balance: true },
      }),
    ])

    const revenue = Number(revenueResult[0]?.total) || 0
    const expenses = Number(expenseResult[0]?.total) || 0
    const profit = revenue - expenses

    // Get invoice status breakdown
    const invoiceList = await db.query.invoices.findMany({
      where: eq(invoices.companyId, companyId),
      columns: { status: true, total: true },
    })

    const statusTotals: Record<string, number> = {}
    invoiceList.forEach((inv) => {
      statusTotals[inv.status] = (statusTotals[inv.status] || 0) + Number(inv.total)
    })

    const overdueTotal = statusTotals['OVERDUE'] || 0
    const outstandingTotal = (statusTotals['SENT'] || 0) + (statusTotals['OVERDUE'] || 0) + (statusTotals['PARTIALLY_PAID'] || 0)

    const financialData = {
      revenue,
      expenses,
      profit,
      outstandingInvoices: outstandingTotal,
      overdueInvoices: overdueTotal,
      topCustomers: topCustomersList.map((c) => ({
        name: c.name,
        total: Number(c.balance),
      })),
    }

    const { insights, error } = await getFinancialInsights(financialData)

    if (error) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
      data: { insights },
    }
  } catch (error) {
    logger.error('AI insights error', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate insights',
    }
  }
}
