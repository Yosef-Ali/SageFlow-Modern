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
  type BankAccountFormValues,
  type BankTransactionFormValues,
} from '@/app/actions/banking-actions'
import { useToast } from '@/components/ui/use-toast'

// Query keys
export const bankingKeys = {
  all: ['banking'] as const,
  accounts: () => [...bankingKeys.all, 'accounts'] as const,
  account: (id: string) => [...bankingKeys.all, 'account', id] as const,
  transactions: (accountId: string) => [...bankingKeys.all, 'transactions', accountId] as const,
  summary: () => [...bankingKeys.all, 'summary'] as const,
}

/**
 * Hook to fetch bank accounts
 */
export function useBankAccounts() {
  return useQuery({
    queryKey: bankingKeys.accounts(),
    queryFn: async () => {
      const result = await getBankAccounts()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
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
  return useQuery({
    queryKey: bankingKeys.summary(),
    queryFn: async () => {
      const result = await getBankingSummary()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })
}

/**
 * Hook to fetch transactions for an account
 */
export function useBankTransactions(accountId: string) {
  return useQuery({
    queryKey: bankingKeys.transactions(accountId),
    queryFn: async () => {
      const result = await getBankTransactions(accountId)
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

  return useMutation({
    mutationFn: async (data: BankAccountFormValues) => {
      const result = await createBankAccount(data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: bankingKeys.summary() })
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

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BankAccountFormValues }) => {
      const result = await updateBankAccount(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() })
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

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteBankAccount(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: bankingKeys.summary() })
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

  return useMutation({
    mutationFn: async (data: BankTransactionFormValues) => {
      const result = await createBankTransaction(data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankingKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: bankingKeys.transactions(variables.bankAccountId) })
      queryClient.invalidateQueries({ queryKey: bankingKeys.summary() })
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
