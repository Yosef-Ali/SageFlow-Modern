'use server'

import { chatWithAI, autoScanInvoice, getFinancialInsights } from '@/lib/gemini-service'
import { logger } from '@/lib/logger'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { prisma } from '@/lib/prisma'

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
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, currency: true },
    })

    // Get recent financial summary
    const [totalRevenue, totalExpenses, outstandingInvoices] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId, status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.payment.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] },
        },
        _sum: { total: true },
      }),
    ])

    const financialData = {
      revenue: totalRevenue._sum.total?.toNumber() || 0,
      expenses: totalExpenses._sum.amount?.toNumber() || 0,
      outstandingInvoices: outstandingInvoices._sum.total?.toNumber() || 0,
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
 * Get AI-generated financial insights
 */
export async function getAIInsights(): Promise<ActionResult<{ insights: string }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Gather financial data
    const [
      revenueData,
      expenseData,
      invoiceStats,
      topCustomers,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId, status: 'PAID' },
        _sum: { total: true },
      }),
      prisma.payment.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: { companyId },
        _sum: { total: true },
        _count: true,
      }),
      prisma.customer.findMany({
        where: { companyId },
        orderBy: { balance: 'desc' },
        take: 5,
        select: { name: true, balance: true },
      }),
    ])

    const revenue = revenueData._sum.total?.toNumber() || 0
    const expenses = expenseData._sum.amount?.toNumber() || 0
    const profit = revenue - expenses

    const overdueInvoices = invoiceStats.find((s) => s.status === 'OVERDUE')
    const outstandingInvoices = invoiceStats
      .filter((s) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(s.status))
      .reduce((sum, s) => sum + (s._sum.total?.toNumber() || 0), 0)

    const financialData = {
      revenue,
      expenses,
      profit,
      outstandingInvoices,
      overdueInvoices: overdueInvoices?._sum.total?.toNumber() || 0,
      topCustomers: topCustomers.map((c) => ({
        name: c.name,
        total: c.balance.toNumber(),
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
