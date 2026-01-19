'use server'

import { db } from '@/db'
import { journalEntries, journalLines, chartOfAccounts } from '@/db/schema'
import { eq, and, gte, lte, asc, desc } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { z } from 'zod'

const glFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().optional(),
})

export type GLFilterValues = z.infer<typeof glFilterSchema>

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get General Ledger Report
 */
export async function getGeneralLedger(filters?: GLFilterValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Build where clause
    let whereClause = eq(journalEntries.companyId, companyId)

    if (filters?.startDate) {
      whereClause = and(whereClause, gte(journalEntries.date, new Date(filters.startDate))) as any
    }
    if (filters?.endDate) {
      whereClause = and(whereClause, lte(journalEntries.date, new Date(filters.endDate))) as any
    }

    const entries = await db.query.journalEntries.findMany({
      where: whereClause,
      with: {
        lines: {
          with: {
            account: true
          }
        }
      },
      orderBy: [desc(journalEntries.date)]
    })

    // If filtered by account, we only want entries that have a line for that account
    let filteredEntries = entries
    if (filters?.accountId) {
      filteredEntries = entries.filter(entry =>
        entry.lines.some(line => line.accountId === filters.accountId)
      )
    }

    return { success: true, data: filteredEntries }
  } catch (error) {
    console.error('Error fetching GL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch GL',
    }
  }
}

/**
 * Get GL Summary (Total Debits/Credits)
 */
export async function getGLSummary(filters?: GLFilterValues): Promise<ActionResult<any>> {
  try {
    const report = await getGeneralLedger(filters)
    if (!report.success) return report

    const entries = report.data
    let totalDebit = 0
    let totalCredit = 0

    entries.forEach((entry: any) => {
      entry.lines.forEach((line: any) => {
        if (filters?.accountId) {
          if (line.accountId === filters.accountId) {
            totalDebit += parseFloat(line.debit || '0')
            totalCredit += parseFloat(line.credit || '0')
          }
        } else {
          totalDebit += parseFloat(line.debit || '0')
          totalCredit += parseFloat(line.credit || '0')
        }
      })
    })

    return {
      success: true,
      data: {
        totalDebit,
        totalCredit,
        netBalance: totalDebit - totalCredit,
        entryCount: entries.length
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to calculate summary' }
  }
}
