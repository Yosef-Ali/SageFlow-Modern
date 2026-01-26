import { supabase } from "@/lib/supabase"
import { formatSupabaseError } from "@/lib/error-utils"
import type { ActionResult } from "@/types/api"

// Re-export from new service layer for backward compatibility
export {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getBankTransactions,
  createBankTransaction,
  getBankingSummary,
  reconcileTransactions,
  createReconciliation,
  transferFunds,
  type BankAccountFormValues,
  type BankTransactionFormValues,
  type BankAccount,
  type BankTransaction,
} from '@/services/banking-service'

/**
 * Start a new reconciliation session
 */
export async function startReconciliation(params: {
  bankAccountId: string
  statementDate: Date
  statementBalance: number
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { data, error } = await supabase
      .from('bank_reconciliations')
      .insert({
        bank_account_id: params.bankAccountId,
        statement_date: params.statementDate.toISOString(),
        statement_balance: params.statementBalance,
        status: 'DRAFT',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: { id: data.id } }
  } catch (error) {
    console.error("Error starting reconciliation:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Save a reconciliation item (toggle cleared status)
 */
export async function saveReconciliationItem(
  reconciliationId: string,
  transactionId: string,
  isCleared: boolean
): Promise<ActionResult<void>> {
  try {
    // Check if item exists
    const { data: existing } = await supabase
      .from('reconciliation_items')
      .select('id')
      .eq('reconciliation_id', reconciliationId)
      .eq('transaction_id', transactionId)
      .single()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('reconciliation_items')
        .update({ is_cleared: isCleared })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Insert new
      const { error } = await supabase
        .from('reconciliation_items')
        .insert({
          reconciliation_id: reconciliationId,
          transaction_id: transactionId,
          is_cleared: isCleared,
        })

      if (error) throw error
    }

    // Also update the transaction's reconciled status
    await supabase
      .from('bank_transactions')
      .update({ is_reconciled: isCleared })
      .eq('id', transactionId)

    return { success: true }
  } catch (error) {
    console.error("Error saving reconciliation item:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Finish and complete a reconciliation
 */
export async function finishReconciliation(
  reconciliationId: string
): Promise<ActionResult<void>> {
  try {
    // Update reconciliation status to completed
    const { error: updateError } = await supabase
      .from('bank_reconciliations')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', reconciliationId)

    if (updateError) throw updateError

    // Mark all cleared items' transactions as reconciled
    const { data: items } = await supabase
      .from('reconciliation_items')
      .select('transaction_id')
      .eq('reconciliation_id', reconciliationId)
      .eq('is_cleared', true)

    if (items && items.length > 0) {
      const transactionIds = items.map(i => i.transaction_id)
      await supabase
        .from('bank_transactions')
        .update({ is_reconciled: true })
        .in('id', transactionIds)
    }

    return { success: true }
  } catch (error) {
    console.error("Error finishing reconciliation:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}
