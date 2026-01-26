'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  getCustomersSummary,
} from '@/services/customer-service'
import { CustomerFormValues, CustomerFiltersValues } from '@/lib/validations/customer'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

// Query keys factory
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (companyId: string, filters?: Partial<CustomerFiltersValues>) =>
    [...customerKeys.lists(), companyId, filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  summary: (companyId: string) => [...customerKeys.all, 'summary', companyId] as const,
}

/**
 * Hook to fetch customers with filters
 */
export function useCustomers(filters?: Partial<CustomerFiltersValues>) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: customerKeys.list(companyId, filters),
    queryFn: async () => {
      if (!companyId) {
        return { customers: [], total: 0 }
      }
      const result = await getCustomers(companyId, filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch a single customer
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async () => {
      const result = await getCustomer(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch customer summary stats
 */
export function useCustomersSummary() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: customerKeys.summary(companyId),
    queryFn: async () => {
      if (!companyId) {
        return { total: 0, active: 0, totalBalance: 0 }
      }
      const result = await getCustomersSummary(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to create a customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      if (!user?.companyId) {
        throw new Error('Not authenticated')
      }
      const result = await createCustomer(user.companyId, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customerKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Customer created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create customer',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormValues }) => {
      const result = await updateCustomer(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.detail(id) })
      const previousCustomer = queryClient.getQueryData(customerKeys.detail(id))
      queryClient.setQueryData(customerKeys.detail(id), (old: any) => ({
        ...old,
        ...data,
      }))
      return { previousCustomer }
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousCustomer) {
        queryClient.setQueryData(
          customerKeys.detail(variables.id),
          context.previousCustomer
        )
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update customer',
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: customerKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      })
    },
  })
}

/**
 * Hook to delete a customer (soft delete)
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCustomer(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customerKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete customer',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to restore a soft-deleted customer
 */
export function useRestoreCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await restoreCustomer(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: customerKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Customer restored successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore customer',
        variant: 'destructive',
      })
    },
  })
}
