import { supabase } from "@/lib/supabase"
import { BankAccountFormValues, BankTransactionFormValues } from "@/lib/validations/banking"
import { formatSupabaseError } from "@/lib/error-utils"
import type { ActionResult } from "@/types/api"

export type { BankAccountFormValues, BankTransactionFormValues }

export interface BankAccount {
  id: string
  companyId: string
  accountName: string
  accountNumber: string | null
  bankName: string | null
  accountType: string
  currency: string
  currentBalance: string
  openingBalance: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BankTransaction {
  id: string
  bankAccountId: string
  date: string
  description: string
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'
  amount: string
  reference: string | null
  category: string | null
  isReconciled: boolean
  createdAt: string
}

/**
 * Get all bank accounts for a company
 */
export async function getBankAccounts(companyId: string): Promise<ActionResult<BankAccount[]>> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: (data || []) as BankAccount[] }
  } catch (error) {
    console.error("Error fetching bank accounts:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get single bank account by ID
 */
export async function getBankAccount(id: string): Promise<ActionResult<BankAccount>> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return { success: true, data: data as BankAccount }
  } catch (error) {
    console.error("Error fetching bank account:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Create a new bank account
 */
export async function createBankAccount(
  companyId: string,
  data: BankAccountFormValues
): Promise<ActionResult<BankAccount>> {
  try {
    const { data: newAccount, error } = await supabase
      .from('bank_accounts')
      .insert({
        company_id: companyId,
        account_name: data.accountName,
        account_number: data.accountNumber,
        bank_name: data.bankName,
        account_type: data.accountType || 'CHECKING',
        currency: data.currency || 'ETB',
        opening_balance: data.openingBalance || 0,
        current_balance: data.openingBalance || 0,
        is_active: data.isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: newAccount as BankAccount }
  } catch (error) {
    console.error("Error creating bank account:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Update an existing bank account
 */
export async function updateBankAccount(
  id: string,
  data: BankAccountFormValues
): Promise<ActionResult<BankAccount>> {
  try {
    const { data: updated, error } = await supabase
      .from('bank_accounts')
      .update({
        account_name: data.accountName,
        account_number: data.accountNumber,
        bank_name: data.bankName,
        account_type: data.accountType,
        currency: data.currency,
        is_active: data.isActive,
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: updated as BankAccount }
  } catch (error) {
    console.error("Error updating bank account:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Soft delete a bank account
 */
export async function deleteBankAccount(id: string): Promise<ActionResult<void>> {
  try {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_active: false, updated_at: new Date() })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get transactions for a bank account
 */
export async function getBankTransactions(
  accountId: string,
  filters?: { startDate?: string; endDate?: string; type?: string }
): Promise<ActionResult<BankTransaction[]>> {
  try {
    let query = supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', accountId)
      .order('date', { ascending: false })

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate)
    }

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    const { data, error } = await query

    if (error) throw error
    return { success: true, data: (data || []) as BankTransaction[] }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Create a bank transaction and update account balance atomically
 */
export async function createBankTransaction(
  data: BankTransactionFormValues
): Promise<ActionResult<BankTransaction>> {
  try {
    // Get current balance
    const { data: account, error: fetchError } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', data.bankAccountId)
      .single()

    if (fetchError) throw fetchError

    const currentBalance = Number(account?.current_balance || 0)
    const amount = Number(data.amount)

    // Calculate balance adjustment based on transaction type
    let balanceAdjustment: number
    switch (data.type) {
      case 'DEPOSIT':
        balanceAdjustment = amount
        break
      case 'WITHDRAWAL':
        balanceAdjustment = -amount
        break
      case 'TRANSFER':
        // Transfer out is negative, transfer in would be handled as a deposit to target account
        balanceAdjustment = -amount
        break
      default:
        balanceAdjustment = 0
    }

    const newBalance = currentBalance + balanceAdjustment

    // Insert transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('bank_transactions')
      .insert({
        bank_account_id: data.bankAccountId,
        date: data.date,
        description: data.description,
        type: data.type,
        amount: data.amount,
        reference: data.reference,
        category: data.category,
        is_reconciled: false,
      })
      .select()
      .single()

    if (transactionError) throw transactionError

    // Update account balance
    const { error: updateError } = await supabase
      .from('bank_accounts')
      .update({
        current_balance: newBalance,
        updated_at: new Date(),
      })
      .eq('id', data.bankAccountId)

    if (updateError) {
      console.error("Error updating balance:", updateError)
      // Transaction was created but balance update failed - log for reconciliation
    }

    return { success: true, data: transaction as BankTransaction }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Delete a bank transaction with balance reversal
 */
export async function deleteBankTransaction(id: string): Promise<ActionResult<void>> {
  try {
    // ============ PEACHTREE LOGIC: Reverse balance before deletion ============

    // Fetch transaction first
    const { data: transaction, error: fetchError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!transaction) throw new Error('Transaction not found')

    // Cannot delete reconciled transactions
    if (transaction.is_reconciled) {
      return { success: false, error: 'Cannot delete a reconciled transaction.' }
    }

    // Get current account balance
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', transaction.bank_account_id)
      .single()

    if (accountError) throw accountError

    const currentBalance = Number(account?.current_balance || 0)
    const amount = Number(transaction.amount)

    // Calculate reversal adjustment
    let reverseAdjustment: number
    switch (transaction.type) {
      case 'DEPOSIT':
        reverseAdjustment = -amount // Reverse a deposit = subtract
        break
      case 'WITHDRAWAL':
      case 'TRANSFER':
        reverseAdjustment = amount // Reverse a withdrawal = add back
        break
      default:
        reverseAdjustment = 0
    }

    const newBalance = currentBalance + reverseAdjustment

    // Update account balance
    const { error: updateError } = await supabase
      .from('bank_accounts')
      .update({
        current_balance: newBalance,
        updated_at: new Date(),
      })
      .eq('id', transaction.bank_account_id)

    if (updateError) throw updateError

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    console.log(`[deleteBankTransaction] Deleted transaction ${id}, balance adjusted by ${reverseAdjustment}`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Update a bank transaction with balance reversal
 */
export async function updateBankTransaction(
  id: string,
  data: BankTransactionFormValues
): Promise<ActionResult<BankTransaction>> {
  try {
    // ============ PEACHTREE LOGIC: Reverse old effects, apply new ============

    // Fetch old transaction
    const { data: oldTransaction, error: fetchError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!oldTransaction) throw new Error('Transaction not found')

    // Cannot edit reconciled transactions
    if (oldTransaction.is_reconciled) {
      return { success: false, error: 'Cannot edit a reconciled transaction.' }
    }

    const oldAmount = Number(oldTransaction.amount)
    const newAmount = Number(data.amount)

    // Calculate old effect on balance
    let oldEffect: number
    switch (oldTransaction.type) {
      case 'DEPOSIT': oldEffect = oldAmount; break
      case 'WITHDRAWAL':
      case 'TRANSFER': oldEffect = -oldAmount; break
      default: oldEffect = 0
    }

    // Calculate new effect on balance
    let newEffect: number
    switch (data.type) {
      case 'DEPOSIT': newEffect = newAmount; break
      case 'WITHDRAWAL':
      case 'TRANSFER': newEffect = -newAmount; break
      default: newEffect = 0
    }

    // Handle account changes
    if (oldTransaction.bank_account_id === data.bankAccountId) {
      // Same account - adjust by difference
      const effectDiff = newEffect - oldEffect

      if (effectDiff !== 0) {
        const { data: account } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', data.bankAccountId)
          .single()

        if (account) {
          const newBalance = Number(account.current_balance) + effectDiff
          await supabase
            .from('bank_accounts')
            .update({ current_balance: newBalance, updated_at: new Date() })
            .eq('id', data.bankAccountId)
        }
      }
    } else {
      // Different account - reverse from old, apply to new
      // Reverse from old account
      const { data: oldAccount } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', oldTransaction.bank_account_id)
        .single()

      if (oldAccount) {
        const reversedBalance = Number(oldAccount.current_balance) - oldEffect
        await supabase
          .from('bank_accounts')
          .update({ current_balance: reversedBalance, updated_at: new Date() })
          .eq('id', oldTransaction.bank_account_id)
      }

      // Apply to new account
      const { data: newAccount } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', data.bankAccountId)
        .single()

      if (newAccount) {
        const newBalance = Number(newAccount.current_balance) + newEffect
        await supabase
          .from('bank_accounts')
          .update({ current_balance: newBalance, updated_at: new Date() })
          .eq('id', data.bankAccountId)
      }
    }

    // Update the transaction
    const { data: updated, error: updateError } = await supabase
      .from('bank_transactions')
      .update({
        bank_account_id: data.bankAccountId,
        date: data.date,
        description: data.description,
        type: data.type,
        amount: newAmount,
        reference: data.reference,
        category: data.category,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    console.log(`[updateBankTransaction] Updated transaction ${id}`)
    return { success: true, data: updated as BankTransaction }
  } catch (error) {
    console.error("Error updating transaction:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Mark transactions as reconciled
 */
export async function reconcileTransactions(
  transactionIds: string[]
): Promise<ActionResult<void>> {
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .update({ is_reconciled: true })
      .in('id', transactionIds)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Create a bank reconciliation
 */
export async function createReconciliation(
  bankAccountId: string,
  statementDate: string,
  statementBalance: number,
  clearedTransactionIds: string[]
): Promise<ActionResult<{ id: string }>> {
  try {
    // Create reconciliation record
    const { data: reconciliation, error: reconcileError } = await supabase
      .from('bank_reconciliations')
      .insert({
        bank_account_id: bankAccountId,
        statement_date: statementDate,
        statement_balance: statementBalance,
        status: 'COMPLETED',
        completed_at: new Date(),
      })
      .select()
      .single()

    if (reconcileError) throw reconcileError

    // Create reconciliation items for cleared transactions
    if (clearedTransactionIds.length > 0) {
      const items = clearedTransactionIds.map(transactionId => ({
        reconciliation_id: reconciliation.id,
        transaction_id: transactionId,
        is_cleared: true,
      }))

      await supabase.from('reconciliation_items').insert(items)

      // Mark transactions as reconciled
      await supabase
        .from('bank_transactions')
        .update({ is_reconciled: true })
        .in('id', clearedTransactionIds)
    }

    return { success: true, data: { id: reconciliation.id } }
  } catch (error) {
    console.error("Error creating reconciliation:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get banking summary for a company
 */
export async function getBankingSummary(companyId: string): Promise<ActionResult<{
  totalBalance: number
  accountCount: number
  unreconciledTransactions: number
}>> {
  try {
    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('id, current_balance')
      .eq('company_id', companyId)
      .eq('is_active', true)

    const totalBalance = accounts?.reduce(
      (sum, acc) => sum + (Number(acc.current_balance) || 0),
      0
    ) || 0

    // Get unreconciled transaction count
    const accountIds = accounts?.map(a => a.id) || []
    let unreconciledCount = 0

    if (accountIds.length > 0) {
      const { count } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .in('bank_account_id', accountIds)
        .eq('is_reconciled', false)

      unreconciledCount = count || 0
    }

    return {
      success: true,
      data: {
        totalBalance,
        accountCount: accounts?.length || 0,
        unreconciledTransactions: unreconciledCount,
      }
    }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Transfer funds between accounts
 */
export async function transferFunds(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string,
  date: string
): Promise<ActionResult<void>> {
  try {
    // Create withdrawal transaction from source
    const withdrawResult = await createBankTransaction({
      bankAccountId: fromAccountId,
      date: new Date(date),
      description: `Transfer to: ${description}`,
      type: 'WITHDRAWAL',
      amount,
    })

    if (!withdrawResult.success) {
      return { success: false, error: withdrawResult.error }
    }

    // Create deposit transaction to destination
    const depositResult = await createBankTransaction({
      bankAccountId: toAccountId,
      date: new Date(date),
      description: `Transfer from: ${description}`,
      type: 'DEPOSIT',
      amount,
    })

    if (!depositResult.success) {
      return { success: false, error: depositResult.error }
    }

    return { success: true }
  } catch (error) {
    console.error("Error transferring funds:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}
