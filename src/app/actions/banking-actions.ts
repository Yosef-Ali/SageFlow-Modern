'use server'

import { db } from '@/db'
import { bankAccounts, bankTransactions } from '@/db/schema'
import { eq, and, desc, asc, count, sql, gte, lte } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schemas
const bankAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountType: z.enum(['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'OTHER']).default('CHECKING'),
  currency: z.string().default('ETB'),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true),
})

const bankTransactionSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank account is required'),
  date: z.date(),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
  amount: z.number().positive('Amount must be positive'),
  reference: z.string().optional(),
  category: z.string().optional(),
})

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>
export type BankTransactionFormValues = z.infer<typeof bankTransactionSchema>

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get list of bank accounts
 */
export async function getBankAccounts(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const accounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.companyId, companyId),
      orderBy: asc(bankAccounts.accountName),
    })

    return { success: true, data: accounts }
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch accounts',
    }
  }
}

/**
 * Get a single bank account
 */
export async function getBankAccount(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, companyId)),
    })

    if (!account) {
      return { success: false, error: 'Bank account not found' }
    }

    return { success: true, data: account }
  } catch (error) {
    console.error('Error fetching bank account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account',
    }
  }
}

/**
 * Create a new bank account
 */
export async function createBankAccount(data: BankAccountFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validatedData = bankAccountSchema.parse(data)

    const [newAccount] = await db
      .insert(bankAccounts)
      .values({
        companyId,
        accountName: validatedData.accountName,
        accountNumber: validatedData.accountNumber || null,
        bankName: validatedData.bankName || null,
        accountType: validatedData.accountType,
        currency: validatedData.currency,
        openingBalance: String(validatedData.openingBalance),
        currentBalance: String(validatedData.openingBalance),
        isActive: validatedData.isActive,
      })
      .returning()

    revalidatePath('/dashboard/banking')

    return { success: true, data: newAccount }
  } catch (error) {
    console.error('Error creating bank account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account',
    }
  }
}

/**
 * Update a bank account
 */
export async function updateBankAccount(id: string, data: BankAccountFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validatedData = bankAccountSchema.parse(data)

    const existing = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, companyId)),
    })

    if (!existing) {
      return { success: false, error: 'Bank account not found' }
    }

    const [updated] = await db
      .update(bankAccounts)
      .set({
        accountName: validatedData.accountName,
        accountNumber: validatedData.accountNumber || null,
        bankName: validatedData.bankName || null,
        accountType: validatedData.accountType,
        currency: validatedData.currency,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning()

    revalidatePath('/dashboard/banking')
    revalidatePath(`/dashboard/banking/${id}`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating bank account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update account',
    }
  }
}

/**
 * Delete a bank account
 */
export async function deleteBankAccount(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const existing = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, companyId)),
    })

    if (!existing) {
      return { success: false, error: 'Bank account not found' }
    }

    // Delete associated transactions first
    await db.delete(bankTransactions).where(eq(bankTransactions.bankAccountId, id))
    await db.delete(bankAccounts).where(eq(bankAccounts.id, id))

    revalidatePath('/dashboard/banking')

    return { success: true }
  } catch (error) {
    console.error('Error deleting bank account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account',
    }
  }
}

/**
 * Get transactions for a bank account
 */
export async function getBankTransactions(
  bankAccountId: string,
  filters?: { dateFrom?: Date; dateTo?: Date }
): Promise<ActionResult<any[]>> {
  try {
    const conditions = [eq(bankTransactions.bankAccountId, bankAccountId)]

    if (filters?.dateFrom) {
      conditions.push(gte(bankTransactions.date, filters.dateFrom))
    }
    if (filters?.dateTo) {
      conditions.push(lte(bankTransactions.date, filters.dateTo))
    }

    const transactions = await db.query.bankTransactions.findMany({
      where: and(...conditions),
      orderBy: desc(bankTransactions.date),
    })

    return { success: true, data: transactions }
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
    }
  }
}

/**
 * Create a bank transaction
 */
export async function createBankTransaction(data: BankTransactionFormValues): Promise<ActionResult<any>> {
  try {
    const validatedData = bankTransactionSchema.parse(data)

    const [newTransaction] = await db.transaction(async (tx) => {
      // Create transaction
      const [transaction] = await tx
        .insert(bankTransactions)
        .values({
          bankAccountId: validatedData.bankAccountId,
          date: validatedData.date,
          description: validatedData.description,
          type: validatedData.type,
          amount: String(validatedData.amount),
          reference: validatedData.reference || null,
          category: validatedData.category || null,
        })
        .returning()

      // Update account balance
      const balanceChange = validatedData.type === 'DEPOSIT'
        ? validatedData.amount
        : -validatedData.amount

      await tx
        .update(bankAccounts)
        .set({
          currentBalance: sql`${bankAccounts.currentBalance} + ${balanceChange}`,
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, validatedData.bankAccountId))

      return [transaction]
    })

    revalidatePath('/dashboard/banking')
    revalidatePath(`/dashboard/banking/${validatedData.bankAccountId}`)

    return { success: true, data: newTransaction }
  } catch (error) {
    console.error('Error creating transaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction',
    }
  }
}

/**
 * Get banking summary
 */
export async function getBankingSummary(): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const accounts = await db.query.bankAccounts.findMany({
      where: and(eq(bankAccounts.companyId, companyId), eq(bankAccounts.isActive, true)),
    })

    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.currentBalance), 0)
    const accountCount = accounts.length

    // Get this month's money in/out
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    let moneyIn = 0
    let moneyOut = 0

    for (const account of accounts) {
      const transactions = await db.query.bankTransactions.findMany({
        where: and(
          eq(bankTransactions.bankAccountId, account.id),
          gte(bankTransactions.date, startOfMonth)
        ),
      })

      for (const tx of transactions) {
        if (tx.type === 'DEPOSIT') {
          moneyIn += Number(tx.amount)
        } else {
          moneyOut += Number(tx.amount)
        }
      }
    }

    return {
      success: true,
      data: {
        totalBalance,
        accountCount,
        moneyIn,
        moneyOut,
      },
    }
  } catch (error) {
    console.error('Error fetching banking summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch summary',
    }
  }
}
