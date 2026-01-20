'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  bankAccounts, bankTransactions,
  bankReconciliations, reconciliationItems
} from '@/db/schema'
import { eq, desc, asc, and, inArray, sql } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  BankAccountFormValues,
  BankTransactionFormValues,
  ReconciliationFormValues
} from '@/lib/validations/banking'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// --- BANK ACCOUNTS ---

export async function createBankAccount(data: BankAccountFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    await db.insert(bankAccounts).values({
      companyId,
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      currency: data.currency,
      openingBalance: String(data.openingBalance),
      currentBalance: String(data.openingBalance), // Start with opening
    })
    revalidatePath('/dashboard/banking')
    return { success: true, data: { message: 'Bank Account Created' } }
  } catch (error) {
    return { success: false, error: 'Failed to create bank account' }
  }
}

export async function getBankAccounts(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const accounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.companyId, companyId),
      orderBy: desc(bankAccounts.createdAt)
    })
    return { success: true, data: accounts }
  } catch (error) {
    return { success: false, error: 'Failed to fetch bank accounts' }
  }
}

export async function getBankAccount(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()
    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, companyId)),
      with: {
        transactions: {
          orderBy: desc(bankTransactions.date),
          limit: 100 // Limit for initial view
        }
      }
    })
    if (!account) return { success: false, error: 'Account not found' }
    return { success: true, data: account }
  } catch (error) {
    return { success: false, error: 'Failed to fetch account' }
  }
}

export async function getUnclearedTransactions(accountId: string): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    // Ensure account belongs to company
    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, accountId), eq(bankAccounts.companyId, companyId))
    })
    if (!account) return { success: false, error: 'Account not found' }

    const txs = await db.select().from(bankTransactions)
      .where(and(
        eq(bankTransactions.bankAccountId, accountId),
        eq(bankTransactions.isReconciled, false)
      ))
      .orderBy(asc(bankTransactions.date)) // Oldest first for recon usually

    return { success: true, data: txs }
  } catch (error) {
    return { success: false, error: 'Failed to fetch transactions' }
  }
}

// --- TRANSACTIONS ---

export async function createBankTransaction(data: BankTransactionFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    await db.transaction(async (tx) => {
      // 1. Create Transaction
      await tx.insert(bankTransactions).values({
        bankAccountId: data.bankAccountId,
        date: data.date,
        description: data.description,
        type: data.type,
        amount: String(data.amount),
        reference: data.reference,
        category: data.category,
        isReconciled: false
      })

      // 2. Update Balance
      const amountChange = data.type === 'DEPOSIT' ? data.amount : -data.amount

      await tx.update(bankAccounts)
        .set({
          currentBalance: sql`${bankAccounts.currentBalance} + ${String(amountChange)}`,
          updatedAt: new Date()
        })
        .where(eq(bankAccounts.id, data.bankAccountId))
    })

    revalidatePath(`/dashboard/banking/${data.bankAccountId}`)
    return { success: true, data: { message: 'Transaction recorded' } }
  } catch (error) {
    return { success: false, error: 'Failed to record transaction' }
  }
}

// --- RECONCILIATION ---

export async function startReconciliation(data: ReconciliationFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Check if there is already an open reconciliation for this account?
    // Ideally yes, but skipping check for prototype speed. 

    const [recon] = await db.insert(bankReconciliations).values({
      bankAccountId: data.bankAccountId,
      statementDate: data.statementDate,
      statementBalance: String(data.statementBalance),
      status: 'DRAFT',
    }).returning()

    // We do NOT pull non-cleared items into a fixed list yet. 
    // We will query them dynamically in the UI. 
    // Or if we want to "lock" the snapshot, we could insert them into items now.
    // Let's adopt a dynamic approach: The UI fetches all UNRECONCILED transactions 
    // + any items already linked to this DRAFT reconciliation.

    return { success: true, data: recon }
  } catch (error) {
    return { success: false, error: 'Failed to start reconciliation' }
  }
}

export async function saveReconciliationItem(
  reconciliationId: string,
  transactionId: string,
  isCleared: boolean
): Promise<ActionResult<any>> {
  try {
    // Check if item exists
    const existing = await db.query.reconciliationItems.findFirst({
      where: and(
        eq(reconciliationItems.reconciliationId, reconciliationId),
        eq(reconciliationItems.transactionId, transactionId)
      )
    })

    if (existing) {
      // Update
      await db.update(reconciliationItems)
        .set({ isCleared })
        .where(eq(reconciliationItems.id, existing.id))
    } else {
      // Insert
      await db.insert(reconciliationItems).values({
        reconciliationId,
        transactionId,
        isCleared
      })
    }

    return { success: true, data: { message: 'Saved' } }
  } catch (error) {
    return { success: false, error: 'Failed to save item' }
  }
}

export async function finishReconciliation(reconciliationId: string): Promise<ActionResult<any>> {
  try {
    await db.transaction(async (tx) => {
      // 1. Get all cleared items for this reconciliation
      const items = await tx.query.reconciliationItems.findMany({
        where: and(
          eq(reconciliationItems.reconciliationId, reconciliationId),
          eq(reconciliationItems.isCleared, true)
        )
      })

      // 2. Mark transactions as Reconciled
      for (const item of items) {
        await tx.update(bankTransactions)
          .set({ isReconciled: true })
          .where(eq(bankTransactions.id, item.transactionId))
      }

      // 3. Mark Reconciliation as Completed
      await tx.update(bankReconciliations)
        .set({ status: 'COMPLETED', completedAt: new Date() })
        .where(eq(bankReconciliations.id, reconciliationId))
    })

    revalidatePath('/dashboard/banking')
    return { success: true, data: { message: 'Reconciliation Completed' } }
  } catch (error) {
    return { success: false, error: 'Failed to finish reconciliation' }
  }
}

// --- ADDITIONAL FUNCTIONS FOR HOOKS ---

export async function updateBankAccount(id: string, data: BankAccountFormValues): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, companyId))
    })
    if (!account) return { success: false, error: 'Account not found' }

    await db.update(bankAccounts)
      .set({
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        currency: data.currency,
        isActive: data.isActive ?? true,
        updatedAt: new Date()
      })
      .where(eq(bankAccounts.id, id))

    revalidatePath('/dashboard/banking')
    revalidatePath(`/dashboard/banking/${id}`)
    return { success: true, data: { message: 'Bank Account Updated' } }
  } catch (error) {
    return { success: false, error: 'Failed to update bank account' }
  }
}

export async function deleteBankAccount(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, companyId))
    })
    if (!account) return { success: false, error: 'Account not found' }

    // Soft delete by setting isActive to false
    await db.update(bankAccounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(bankAccounts.id, id))

    revalidatePath('/dashboard/banking')
    return { success: true, data: { message: 'Bank Account Deleted' } }
  } catch (error) {
    return { success: false, error: 'Failed to delete bank account' }
  }
}

export async function getBankTransactions(accountId: string): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Verify account ownership
    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, accountId), eq(bankAccounts.companyId, companyId))
    })
    if (!account) return { success: false, error: 'Account not found' }

    const txs = await db.select().from(bankTransactions)
      .where(eq(bankTransactions.bankAccountId, accountId))
      .orderBy(desc(bankTransactions.date))
      .limit(200)

    return { success: true, data: txs }
  } catch (error) {
    return { success: false, error: 'Failed to fetch transactions' }
  }
}

export async function getBankingSummary(): Promise<ActionResult<{
  totalAccounts: number
  totalBalance: number
  activeAccounts: number
}>> {
  try {
    const companyId = await getCurrentCompanyId()

    const accounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.companyId, companyId)
    })

    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.currentBalance || 0), 0)
    const activeAccounts = accounts.filter(acc => acc.isActive).length

    return {
      success: true,
      data: {
        totalAccounts: accounts.length,
        totalBalance,
        activeAccounts
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch banking summary' }
  }
}

// Export types for hooks
export type { BankAccountFormValues, BankTransactionFormValues }

