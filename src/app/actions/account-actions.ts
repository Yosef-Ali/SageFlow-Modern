'use server'

import { db } from '@/db'
import { chartOfAccounts } from '@/db/schema'
import { eq, and, desc, asc, like, or } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schema
const accountSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  accountName: z.string().min(1, 'Account name is required'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  description: z.string().optional(),
  parentAccountId: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type AccountFormValues = z.infer<typeof accountSchema>

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get all chart of accounts
 */
export async function getChartOfAccounts(options?: {
  type?: string
  search?: string
}): Promise<ActionResult<typeof chartOfAccounts.$inferSelect[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    let query = db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.companyId, companyId),
      orderBy: [asc(chartOfAccounts.accountNumber)],
    })

    const accounts = await query

    // Apply filters in memory for simplicity
    let filtered = accounts
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type)
    }
    if (options?.search) {
      const search = options.search.toLowerCase()
      filtered = filtered.filter(a =>
        a.accountNumber.toLowerCase().includes(search) ||
        a.accountName.toLowerCase().includes(search)
      )
    }

    return { success: true, data: filtered }
  } catch (error) {
    console.error('Error fetching chart of accounts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch accounts',
    }
  }
}

/**
 * Get single account by ID
 */
export async function getAccount(id: string): Promise<ActionResult<typeof chartOfAccounts.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()

    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.companyId, companyId)
      ),
    })

    if (!account) {
      return { success: false, error: 'Account not found' }
    }

    return { success: true, data: account }
  } catch (error) {
    console.error('Error fetching account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account',
    }
  }
}

/**
 * Create new account
 */
export async function createAccount(data: AccountFormValues): Promise<ActionResult<typeof chartOfAccounts.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate
    const validated = accountSchema.parse(data)

    // Check for duplicate account number
    const existing = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.companyId, companyId),
        eq(chartOfAccounts.accountNumber, validated.accountNumber)
      ),
    })

    if (existing) {
      return { success: false, error: 'Account number already exists' }
    }

    const [account] = await db.insert(chartOfAccounts).values({
      companyId,
      accountNumber: validated.accountNumber,
      accountName: validated.accountName,
      type: validated.type,
      description: validated.description || null,
      parentAccountId: validated.parentAccountId || null,
      isActive: validated.isActive,
      balance: '0',
    }).returning()

    revalidatePath('/dashboard/chart-of-accounts')

    return { success: true, data: account }
  } catch (error) {
    console.error('Error creating account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account',
    }
  }
}

/**
 * Update account
 */
export async function updateAccount(id: string, data: AccountFormValues): Promise<ActionResult<typeof chartOfAccounts.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()

    const validated = accountSchema.parse(data)

    // Check account exists
    const existing = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.companyId, companyId)
      ),
    })

    if (!existing) {
      return { success: false, error: 'Account not found' }
    }

    const [updated] = await db.update(chartOfAccounts)
      .set({
        accountNumber: validated.accountNumber,
        accountName: validated.accountName,
        type: validated.type,
        description: validated.description || null,
        parentAccountId: validated.parentAccountId || null,
        isActive: validated.isActive,
        updatedAt: new Date(),
      })
      .where(eq(chartOfAccounts.id, id))
      .returning()

    revalidatePath('/dashboard/chart-of-accounts')
    revalidatePath(`/dashboard/chart-of-accounts/${id}`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update account',
    }
  }
}

/**
 * Delete account
 */
export async function deleteAccount(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const existing = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.companyId, companyId)
      ),
    })

    if (!existing) {
      return { success: false, error: 'Account not found' }
    }

    await db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, id))

    revalidatePath('/dashboard/chart-of-accounts')

    return { success: true }
  } catch (error) {
    console.error('Error deleting account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account',
    }
  }
}

/**
 * Get account summary by type
 */
export async function getAccountsSummary(): Promise<ActionResult<{
  assets: { count: number; balance: number }
  liabilities: { count: number; balance: number }
  equity: { count: number; balance: number }
  revenue: { count: number; balance: number }
  expenses: { count: number; balance: number }
  total: number
}>> {
  try {
    const companyId = await getCurrentCompanyId()

    const accounts = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.companyId, companyId),
    })

    const summary = {
      assets: { count: 0, balance: 0 },
      liabilities: { count: 0, balance: 0 },
      equity: { count: 0, balance: 0 },
      revenue: { count: 0, balance: 0 },
      expenses: { count: 0, balance: 0 },
      total: accounts.length,
    }

    for (const acc of accounts) {
      const balance = parseFloat(acc.balance || '0')
      switch (acc.type) {
        case 'ASSET':
          summary.assets.count++
          summary.assets.balance += balance
          break
        case 'LIABILITY':
          summary.liabilities.count++
          summary.liabilities.balance += balance
          break
        case 'EQUITY':
          summary.equity.count++
          summary.equity.balance += balance
          break
        case 'REVENUE':
          summary.revenue.count++
          summary.revenue.balance += balance
          break
        case 'EXPENSE':
          summary.expenses.count++
          summary.expenses.balance += balance
          break
      }
    }

    return { success: true, data: summary }
  } catch (error) {
    console.error('Error getting accounts summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
    }
  }
}
