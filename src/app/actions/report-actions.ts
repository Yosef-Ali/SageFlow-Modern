'use server'

import { db } from '@/db'
import {
  chartOfAccounts, journalEntries, journalLines
} from '@/db/schema'
import { eq, and, lte, gte, sum, sql, desc, asc } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Helper Types
interface AccountBalance {
  accountId: string
  accountName: string
  accountType: string // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  category: string
  debit: number
  credit: number
  balance: number // Net balance based on normal side
}

interface ReportData {
  items: AccountBalance[]
  totalDebit: number
  totalCredit: number
  netIncome?: number // For P&L and Balance Sheet (Retained Earnings)
}

/**
 * Get Trial Balance
 * Lists all accounts with their total Debit and Credit balances as of a date.
 */
export async function getTrialBalance(asOfDate: Date): Promise<ActionResult<ReportData>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Aggregate all journal lines up to date
    const balances = await db
      .select({
        accountId: journalLines.accountId,
        accountName: chartOfAccounts.accountName,
        accountType: chartOfAccounts.type,
        totalDebit: sum(journalLines.debit).mapWith(Number),
        totalCredit: sum(journalLines.credit).mapWith(Number),
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(chartOfAccounts.companyId, companyId),
        lte(journalEntries.date, asOfDate)
      ))
      .groupBy(
        journalLines.accountId,
        chartOfAccounts.accountName,
        chartOfAccounts.type
      )
      .orderBy(chartOfAccounts.type, chartOfAccounts.accountName)

    const items: AccountBalance[] = balances.map(b => ({
      accountId: b.accountId!,
      accountName: b.accountName!,
      accountType: b.accountType!,
      category: b.accountType!, // Use type as category for now
      debit: b.totalDebit || 0,
      credit: b.totalCredit || 0,
      balance: (b.totalDebit || 0) - (b.totalCredit || 0) // Raw net
    }))

    const totalDebit = items.reduce((acc, item) => acc + item.debit, 0)
    const totalCredit = items.reduce((acc, item) => acc + item.credit, 0)

    return { success: true, data: { items, totalDebit, totalCredit } }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to generate Trial Balance' }
  }
}

/**
 * Get Profit and Loss (Income Statement)
 * Revenue - Expenses = Net Income
 */
export async function getProfitAndLoss(startDate: Date, endDate: Date): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const balances = await db
      .select({
        accountId: journalLines.accountId,
        accountName: chartOfAccounts.accountName,
        accountType: chartOfAccounts.type,
        totalDebit: sum(journalLines.debit).mapWith(Number),
        totalCredit: sum(journalLines.credit).mapWith(Number),
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(chartOfAccounts.companyId, companyId),
        gte(journalEntries.date, startDate),
        lte(journalEntries.date, endDate),
        // Filter for Income Statement accounts
        sql`${chartOfAccounts.type} IN ('REVENUE', 'EXPENSE')`
      ))
      .groupBy(
        journalLines.accountId,
        chartOfAccounts.accountName,
        chartOfAccounts.type
      )

    // Group by Type
    const income: AccountBalance[] = []
    const expense: AccountBalance[] = []

    balances.forEach(b => {
      const debit = b.totalDebit || 0
      const credit = b.totalCredit || 0
      // Normal balances: Income = Credit, Expense = Debit
      const type = b.accountType?.toUpperCase()

      if (type?.includes('REVENUE') || type?.includes('INCOME')) {
        income.push({
          accountId: b.accountId!, accountName: b.accountName!, accountType: b.accountType!, category: b.accountType!,
          debit, credit, balance: credit - debit
        })
      } else {
        expense.push({
          accountId: b.accountId!, accountName: b.accountName!, accountType: b.accountType!, category: b.accountType!,
          debit, credit, balance: debit - credit
        })
      }
    })

    const totalIncome = income.reduce((sum, i) => sum + i.balance, 0)
    const totalExpense = expense.reduce((sum, i) => sum + i.balance, 0)
    const netIncome = totalIncome - totalExpense

    return { success: true, data: { income, expense, totalIncome, totalExpense, netIncome } }

  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to generate Profit & Loss' }
  }
}

/**
 * Get Balance Sheet
 * Assets = Liabilities + Equity
 */
export async function getBalanceSheet(asOfDate: Date): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // 1. Calculate Net Income (Retained Earnings) up to this date used to balance the sheet?
    // Actually, Retained Earnings should usually be calculated as sum of all Income - Expenses over ALL TIME up to asOfDate.
    // Let's do that separate query.

    const netIncomeResult = await getProfitAndLoss(new Date('1900-01-01'), asOfDate)
    const retainedEarnings = netIncomeResult.success ? netIncomeResult.data.netIncome : 0

    // 2. Get Asset, Liability, Equity balances
    const balances = await db
      .select({
        accountId: journalLines.accountId,
        accountName: chartOfAccounts.accountName,
        accountType: chartOfAccounts.type,
        totalDebit: sum(journalLines.debit).mapWith(Number),
        totalCredit: sum(journalLines.credit).mapWith(Number),
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(chartOfAccounts, eq(journalLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(chartOfAccounts.companyId, companyId),
        lte(journalEntries.date, asOfDate),
        // Filter for Balance Sheet accounts
        sql`${chartOfAccounts.type} NOT IN ('REVENUE', 'EXPENSE')`
      ))
      .groupBy(
        journalLines.accountId,
        chartOfAccounts.accountName,
        chartOfAccounts.type
      )

    const assets: AccountBalance[] = []
    const liabilities: AccountBalance[] = []
    const equity: AccountBalance[] = []

    balances.forEach(b => {
      const debit = b.totalDebit || 0
      const credit = b.totalCredit || 0
      const type = b.accountType?.toUpperCase()

      // Normal behavior
      if (type?.includes('ASSET')) {
        assets.push({
          accountId: b.accountId!, accountName: b.accountName!, accountType: b.accountType!, category: b.accountType!,
          debit, credit, balance: debit - credit
        })
      } else if (type?.includes('LIABILITY')) {
        liabilities.push({
          accountId: b.accountId!, accountName: b.accountName!, accountType: b.accountType!, category: b.accountType!,
          debit, credit, balance: credit - debit
        })
      } else {
        equity.push({
          accountId: b.accountId!, accountName: b.accountName!, accountType: b.accountType!, category: b.accountType!,
          debit, credit, balance: credit - debit
        })
      }
    })

    // Add Retained Earnings to Equity
    if (retainedEarnings !== 0) {
      equity.push({
        accountId: 'retained-earnings',
        accountName: 'Retained Earnings (Net Income)',
        accountType: 'EQUITY',
        category: 'Equity',
        debit: 0,
        credit: 0,
        balance: retainedEarnings
      })
    }

    const totalAssets = assets.reduce((sum, i) => sum + i.balance, 0)
    const totalLiabilities = liabilities.reduce((sum, i) => sum + i.balance, 0)
    const totalEquity = equity.reduce((sum, i) => sum + i.balance, 0)

    return {
      success: true,
      data: {
        assets, liabilities, equity,
        totalAssets,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity
      }
    }

  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to generate Balance Sheet' }
  }
}
