'use server'

import { chatWithAI, autoScanInvoice, autoScanPayment, getFinancialInsights } from '@/lib/gemini-service'
import { logger } from '@/lib/logger'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { db } from '@/db'
import { companies, invoices, payments, customers, vendors, items, employees } from '@/db/schema'
import { eq, inArray, desc, sum, count, lt, and, sql } from 'drizzle-orm'

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

/**
 * Business context for AI chat - provides real-time data summary
 */
export interface BusinessContext {
  company: {
    name: string
    currency: string
  } | null
  stats: {
    totalRevenue: number
    pendingRevenue: number
    customerCount: number
    invoiceCount: number
    overdueCount: number
    vendorCount: number
    employeeCount: number
    lowStockCount: number
  }
  topCustomers: Array<{
    name: string
    balance: number
  }>
  overdueInvoices: Array<{
    invoiceNumber: string
    customerName: string
    total: number
    dueDate: Date
    daysOverdue: number
  }>
  lowStockItems: Array<{
    name: string
    sku: string
    quantityOnHand: number
    reorderPoint: number
  }>
  recentVendors: Array<{
    name: string
    balance: number
    vendorType: string | null
  }>
}

/**
 * Get comprehensive business context for AI chat
 * This provides real data to the AI so it can give accurate answers
 */
export async function getBusinessContext(): Promise<ActionResult<BusinessContext>> {
  try {
    const companyId = await getCurrentCompanyId()
    const today = new Date()

    // Fetch all data in parallel for performance
    const [
      companyData,
      revenueResult,
      pendingResult,
      customerCountResult,
      invoiceCountResult,
      overdueCountResult,
      vendorCountResult,
      employeeCountResult,
      lowStockCountResult,
      topCustomersList,
      overdueInvoicesList,
      lowStockItemsList,
      recentVendorsList,
    ] = await Promise.all([
      // Company info
      db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        columns: { name: true, currency: true },
      }),

      // Total revenue (paid invoices)
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.status, 'PAID'))),

      // Pending revenue (outstanding invoices)
      db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(and(
          eq(invoices.companyId, companyId),
          inArray(invoices.status, ['SENT', 'PARTIALLY_PAID', 'OVERDUE'])
        )),

      // Customer count
      db
        .select({ count: count() })
        .from(customers)
        .where(and(eq(customers.companyId, companyId), eq(customers.isActive, true))),

      // Invoice count
      db
        .select({ count: count() })
        .from(invoices)
        .where(eq(invoices.companyId, companyId)),

      // Overdue count
      db
        .select({ count: count() })
        .from(invoices)
        .where(and(
          eq(invoices.companyId, companyId),
          eq(invoices.status, 'OVERDUE')
        )),

      // Vendor count
      db
        .select({ count: count() })
        .from(vendors)
        .where(and(eq(vendors.companyId, companyId), eq(vendors.isActive, true))),

      // Employee count
      db
        .select({ count: count() })
        .from(employees)
        .where(and(eq(employees.companyId, companyId), eq(employees.isActive, true))),

      // Low stock count (quantity on hand below reorder point)
      db
        .select({ count: count() })
        .from(items)
        .where(and(
          eq(items.companyId, companyId),
          eq(items.isActive, true),
          sql`${items.quantityOnHand} < ${items.reorderPoint}`
        )),

      // Top 5 customers by balance
      db.query.customers.findMany({
        where: and(eq(customers.companyId, companyId), eq(customers.isActive, true)),
        orderBy: desc(customers.balance),
        limit: 5,
        columns: { name: true, balance: true },
      }),

      // Overdue invoices with customer info
      db.query.invoices.findMany({
        where: and(
          eq(invoices.companyId, companyId),
          eq(invoices.status, 'OVERDUE')
        ),
        orderBy: invoices.dueDate,
        limit: 10,
        with: {
          customer: {
            columns: { name: true },
          },
        },
      }),

      // Low stock items
      db.query.items.findMany({
        where: and(
          eq(items.companyId, companyId),
          eq(items.isActive, true),
          sql`${items.quantityOnHand} < ${items.reorderPoint}`
        ),
        limit: 10,
        columns: {
          name: true,
          sku: true,
          quantityOnHand: true,
          reorderPoint: true,
        },
      }),

      // Recent vendors
      db.query.vendors.findMany({
        where: eq(vendors.companyId, companyId),
        orderBy: desc(vendors.updatedAt),
        limit: 5,
        columns: { name: true, balance: true, vendorType: true },
      }),
    ])

    return {
      success: true,
      data: {
        company: companyData ? {
          name: companyData.name,
          currency: companyData.currency || 'ETB',
        } : null,
        stats: {
          totalRevenue: Number(revenueResult[0]?.total) || 0,
          pendingRevenue: Number(pendingResult[0]?.total) || 0,
          customerCount: customerCountResult[0]?.count || 0,
          invoiceCount: invoiceCountResult[0]?.count || 0,
          overdueCount: overdueCountResult[0]?.count || 0,
          vendorCount: vendorCountResult[0]?.count || 0,
          employeeCount: employeeCountResult[0]?.count || 0,
          lowStockCount: lowStockCountResult[0]?.count || 0,
        },
        topCustomers: topCustomersList.map(c => ({
          name: c.name,
          balance: Number(c.balance),
        })),
        overdueInvoices: overdueInvoicesList.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer.name,
          total: Number(inv.total),
          dueDate: inv.dueDate,
          daysOverdue: Math.floor((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        lowStockItems: lowStockItemsList.map(item => ({
          name: item.name,
          sku: item.sku,
          quantityOnHand: Number(item.quantityOnHand),
          reorderPoint: Number(item.reorderPoint),
        })),
        recentVendors: recentVendorsList.map(v => ({
          name: v.name,
          balance: Number(v.balance),
          vendorType: v.vendorType,
        })),
      },
    }
  } catch (error) {
    logger.error('Business context error', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get business context',
    }
  }
}
