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
import { useAuth } from '@/lib/auth-context'

// Query keys
export const accountKeys = {
  all: ['accounts'] as const,
  list: (companyId: string, filters?: { type?: string; search?: string }) => [...accountKeys.all, 'list', companyId, filters] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
  summary: (companyId: string) => [...accountKeys.all, 'summary', companyId] as const,
}

/**
 * Hook to fetch all accounts
 */
export function useAccounts(filters?: { type?: string; search?: string }) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: accountKeys.list(companyId, filters),
    queryFn: async () => {
      const result = await getChartOfAccounts(companyId, filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
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
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: accountKeys.summary(companyId),
    queryFn: async () => {
      const result = await getAccountsSummary(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to create account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const result = await createAccount({ ...data, companyId: user?.companyId })
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
