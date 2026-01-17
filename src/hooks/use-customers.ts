'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
} from '@/app/actions/customer-actions'
import { CustomerFormValues, CustomerFiltersValues } from '@/lib/validations/customer'
import { useToast } from '@/components/ui/use-toast'

// Query keys
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters?: Partial<CustomerFiltersValues>) =>
    [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
}

/**
 * Hook to fetch customers with filters
 */
export function useCustomers(filters?: Partial<CustomerFiltersValues>) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: async () => {
      const result = await getCustomers(filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
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
 * Hook to create a customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const result = await createCustomer(data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
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

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormValues }) => {
      const result = await updateCustomer(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: customerKeys.detail(id) })

      // Snapshot previous value
      const previousCustomer = queryClient.getQueryData(customerKeys.detail(id))

      // Optimistically update
      queryClient.setQueryData(customerKeys.detail(id), (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousCustomer }
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
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
