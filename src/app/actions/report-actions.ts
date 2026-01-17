'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { Decimal } from '@prisma/client/runtime/library'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export interface ProfitLossData {
  revenue: {
    total: number
    items: { name: string; amount: number }[]
  }
  cogs: {
    total: number
    items: { name: string; amount: number }[]
  }
  expenses: {
    total: number
    items: { name: string; amount: number }[]
  }
  grossProfit: number
  netIncome: number
  period: {
    from: string
    to: string
  }
}

export interface BalanceSheetData {
  assets: {
    total: number
    categories: {
      name: string
      total: number
      items: { name: string; amount: number }[]
    }[]
  }
  liabilities: {
    total: number
    categories: {
      name: string
      total: number
      items: { name: string; amount: number }[]
    }[]
  }
  equity: {
    total: number
    categories: {
      name: string
      total: number
      items: { name: string; amount: number }[]
    }[]
  }
  period: string
}

/**
 * Get Profit & Loss Report
 */
export async function getProfitLoss(
  from?: Date,
  to?: Date
): Promise<ActionResult<ProfitLossData>> {
  try {
    const companyId = await getCurrentCompanyId()
    const dateFrom = from || new Date(new Date().getFullYear(), 0, 1) // Start of year
    const dateTo = to || new Date()

    // 1. Calculate Revenue (Invoices excluding tax)
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        date: { gte: dateFrom, lte: dateTo },
        status: { not: 'CANCELLED' },
      },
      select: {
        total: true,
        taxAmount: true,
      },
    })

    const totalRevenue = invoices.reduce(
      (acc, inv) => acc + (inv.total.toNumber() - inv.taxAmount.toNumber()),
      0
    )

    // 2. Calculate COGS (InvoiceItems * Item Cost)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          date: { gte: dateFrom, lte: dateTo },
          status: { not: 'CANCELLED' },
        },
      },
      include: {
        item: {
          select: {
            costPrice: true,
            name: true,
          },
        },
      },
    })

    const totalCogs = invoiceItems.reduce((acc, item) => {
      const cost = item.item?.costPrice.toNumber() || 0
      return acc + (item.quantity.toNumber() * cost)
    }, 0)

    // 3. Expenses (Placeholder - until Expense/Bill models are added)
    // We can pull from ChartOfAccount balances if they were manually updated
    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: {
        companyId,
        type: 'EXPENSE',
        isActive: true,
      },
    })

    const totalExpenses = expenseAccounts.reduce(
      (acc, accnt) => acc + accnt.balance.toNumber(),
      0
    )

    const grossProfit = totalRevenue - totalCogs
    const netIncome = grossProfit - totalExpenses

    return {
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          items: [{ name: 'Sales Revenue', amount: totalRevenue }],
        },
        cogs: {
          total: totalCogs,
          items: [{ name: 'Cost of Goods Sold', amount: totalCogs }],
        },
        expenses: {
          total: totalExpenses,
          items: expenseAccounts.map((a) => ({ name: a.accountName, amount: a.balance.toNumber() })),
        },
        grossProfit,
        netIncome,
        period: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString(),
        },
      },
    }
  } catch (error) {
    console.error('Error generating Profit & Loss:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    }
  }
}

/**
 * Get Balance Sheet Report
 */
export async function getBalanceSheet(
  asOf?: Date
): Promise<ActionResult<BalanceSheetData>> {
  try {
    const companyId = await getCurrentCompanyId()
    const dateTo = asOf || new Date()

    // Assets
    // Cash: Sum of all payments received
    const payments = await prisma.payment.aggregate({
      where: { companyId, paymentDate: { lte: dateTo } },
      _sum: { amount: true },
    })
    const cashBalance = payments._sum.amount?.toNumber() || 0

    // AR: Unpaid Invoices
    const arInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        date: { lte: dateTo },
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: { total: true, paidAmount: true },
    })
    const arBalance = arInvoices.reduce(
      (acc, inv) => acc + (inv.total.toNumber() - inv.paidAmount.toNumber()),
      0
    )

    // Inventory Value
    const items = await prisma.item.findMany({
      where: { companyId },
      select: { quantityOnHand: true, costPrice: true },
    })
    const inventoryValue = items.reduce(
      (acc, item) => acc + (item.quantityOnHand.toNumber() * item.costPrice.toNumber()),
      0
    )

    // Liabilities
    // VAT Payable (15%) - approximated as 15% of unpaid invoices tax part? 
    // Actually, let's just sum all taxAmount from invoices
    const taxInvoices = await prisma.invoice.aggregate({
      where: { companyId, date: { lte: dateTo }, status: { not: 'CANCELLED' } },
      _sum: { taxAmount: true },
    })
    const vatPayable = taxInvoices._sum.taxAmount?.toNumber() || 0

    // AP: Placeholder (no Bills yet)
    const apBalance = 0

    // Equity
    // Retained Earnings (all time P&L)
    const allTimePl = await getProfitLoss(new Date(2000, 0, 1), dateTo)
    const netIncomeAllTime = allTimePl.success ? allTimePl.data!.netIncome : 0

    return {
      success: true,
      data: {
        assets: {
          total: cashBalance + arBalance + inventoryValue,
          categories: [
            {
              name: 'Current Assets',
              total: cashBalance + arBalance + inventoryValue,
              items: [
                { name: 'Cash', amount: cashBalance },
                { name: 'Accounts Receivable', amount: arBalance },
                { name: 'Inventory', amount: inventoryValue },
              ],
            },
          ],
        },
        liabilities: {
          total: vatPayable + apBalance,
          categories: [
            {
              name: 'Current Liabilities',
              total: vatPayable + apBalance,
              items: [
                { name: 'VAT Payable', amount: vatPayable },
                { name: 'Accounts Payable', amount: apBalance },
              ],
            },
          ],
        },
        equity: {
          total: netIncomeAllTime,
          categories: [
            {
              name: 'Equity',
              total: netIncomeAllTime,
              items: [{ name: 'Retained Earnings', amount: netIncomeAllTime }],
            },
          ],
        },
        period: dateTo.toISOString(),
      },
    }
  } catch (error) {
    console.error('Error generating Balance Sheet:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
    }
  }
}
