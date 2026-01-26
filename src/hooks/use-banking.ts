'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getBankTransactions,
  createBankTransaction,
  getBankingSummary,
  reconcileTransactions,
  transferFunds,
  type BankAccountFormValues,
  type BankTransactionFormValues,
} from '@/services/banking-service'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

// Query keys factory
export const bankingKeys = {
  all: ['banking'] as const,
  accounts: (companyId: string) => [...bankingKeys.all, 'accounts', companyId] as const,
  account: (id: string) => [...bankingKeys.all, 'account', id] as const,
  transactions: (accountId: string) => [...bankingKeys.all, 'transactions', accountId] as const,
  summary: (companyId: string) => [...bankingKeys.all, 'summary', companyId] as const,
}

/**
 * Hook to fetch bank accounts
 */
export function useBankAccounts() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: bankingKeys.accounts(companyId),
    queryFn: async () => {
      if (!companyId) return []
      const result = await getBankAccounts(companyId)
      if (!result.success) {
        console.error(result.error)
        return []
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch a single bank account
 */
export function useBankAccount(id: string) {
  return useQuery({
    queryKey: bankingKeys.account(id),
    queryFn: async () => {
      const result = await getBankAccount(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch banking summary
 */
export function useBankingSummary() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: bankingKeys.summary(companyId),
    queryFn: async () => {
      if (!companyId) {
        return { totalBalance: 0, accountCount: 0, unreconciledTransactions: 0 }
      }
      const result = await getBankingSummary(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch transactions for an account
 */
export function useBankTransactions(
  accountId: string,
  filters?: { startDate?: string; endDate?: string; type?: string }
) {
  return useQuery({
    queryKey: bankingKeys.transactions(accountId),
    queryFn: async () => {
      const result = await getBankTransactions(accountId, filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!accountId,
  })
}

/**
 * Hook to create a bank account
 */
export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: BankAccountFormValues) => {
      if (!user?.companyId) {
        throw new Error('Not authenticated')
      }
      const result = await createBankAccount(user.companyId, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: bankingKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Bank account created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update a bank account
 */
export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BankAccountFormValues }) => {
      const result = await updateBankAccount(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: bankingKeys.account(variables.id) })
      toast({
        title: 'Success',
        description: 'Bank account updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update account',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete a bank account
 */
export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteBankAccount(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: bankingKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Bank account deleted',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to create a transaction
 */
export function useCreateBankTransaction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: BankTransactionFormValues) => {
      const result = await createBankTransaction(data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: bankingKeys.transactions(variables.bankAccountId) })
      queryClient.invalidateQueries({ queryKey: bankingKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Transaction recorded successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record transaction',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to reconcile transactions
 */
export function useReconcileTransactions() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      const result = await reconcileTransactions(transactionIds)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.all })
      toast({
        title: 'Success',
        description: 'Transactions reconciled',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reconcile transactions',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to transfer funds between accounts
 */
export function useTransferFunds() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      fromAccountId,
      toAccountId,
      amount,
      description,
      date,
    }: {
      fromAccountId: string
      toAccountId: string
      amount: number
      description: string
      date: string
    }) => {
      const result = await transferFunds(fromAccountId, toAccountId, amount, description, date)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: bankingKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Transfer completed successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to transfer funds',
        variant: 'destructive',
      })
    },
  })
}
