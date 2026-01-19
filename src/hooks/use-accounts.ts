'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getChartOfAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountsSummary,
  AccountFormValues,
} from '@/app/actions/account-actions'
import { useToast } from '@/components/ui/use-toast'

// Query keys
export const accountKeys = {
  all: ['accounts'] as const,
  list: (filters?: { type?: string; search?: string }) => [...accountKeys.all, 'list', filters] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
  summary: () => [...accountKeys.all, 'summary'] as const,
}

/**
 * Hook to fetch all accounts
 */
export function useAccounts(filters?: { type?: string; search?: string }) {
  return useQuery({
    queryKey: accountKeys.list(filters),
    queryFn: async () => {
      const result = await getChartOfAccounts(filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })
}

/**
 * Hook to fetch single account
 */
export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const result = await getAccount(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to get accounts summary
 */
export function useAccountsSummary() {
  return useQuery({
    queryKey: accountKeys.summary(),
    queryFn: async () => {
      const result = await getAccountsSummary()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })
}

/**
 * Hook to create account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const result = await createAccount(data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      toast({
        title: 'Success',
        description: 'Account created successfully',
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
 * Hook to update account
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AccountFormValues }) => {
      const result = await updateAccount(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      toast({
        title: 'Success',
        description: 'Account updated successfully',
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
 * Hook to delete account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteAccount(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      toast({
        title: 'Success',
        description: 'Account deleted successfully',
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
