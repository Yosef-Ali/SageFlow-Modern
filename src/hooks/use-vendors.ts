'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  restoreVendor,
  getVendorsSummary,
  getVendorsForDropdown,
  VendorFormValues,
} from '@/services/vendor-service'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

// Query keys factory
export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (companyId: string, filters?: { search?: string; status?: string }) =>
    [...vendorKeys.lists(), companyId, filters] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
  summary: (companyId: string) => [...vendorKeys.all, 'summary', companyId] as const,
  dropdown: (companyId: string) => [...vendorKeys.all, 'dropdown', companyId] as const,
}

/**
 * Hook to fetch vendors with filters
 */
export function useVendors(filters?: { search?: string; status?: string }) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: vendorKeys.list(companyId, filters),
    queryFn: async () => {
      if (!companyId) {
        return []
      }
      const result = await getVendors(companyId, filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch a single vendor
 */
export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: async () => {
      const result = await getVendor(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch vendor summary stats
 */
export function useVendorsSummary() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: vendorKeys.summary(companyId),
    queryFn: async () => {
      if (!companyId) {
        return { total: 0, active: 0, totalBalance: 0 }
      }
      const result = await getVendorsSummary(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch vendors for dropdown
 */
export function useVendorsDropdown() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: vendorKeys.dropdown(companyId),
    queryFn: async () => {
      if (!companyId) return []
      const result = await getVendorsForDropdown(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to create a vendor
 */
export function useCreateVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: VendorFormValues) => {
      if (!user?.companyId) {
        throw new Error('Not authenticated')
      }
      const result = await createVendor(user.companyId, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.summary(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: vendorKeys.dropdown(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Vendor created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create vendor',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update a vendor
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorFormValues }) => {
      const result = await updateVendor(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: vendorKeys.detail(id) })
      const previousVendor = queryClient.getQueryData(vendorKeys.detail(id))
      queryClient.setQueryData(vendorKeys.detail(id), (old: any) => ({
        ...old,
        ...data,
      }))
      return { previousVendor }
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousVendor) {
        queryClient.setQueryData(vendorKeys.detail(variables.id), context.previousVendor)
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vendor',
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: vendorKeys.summary(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: vendorKeys.dropdown(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Vendor updated successfully',
      })
    },
  })
}

/**
 * Hook to delete a vendor (soft delete)
 */
export function useDeleteVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteVendor(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.summary(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: vendorKeys.dropdown(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Vendor deleted successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vendor',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to restore a soft-deleted vendor
 */
export function useRestoreVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await restoreVendor(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.summary(user?.companyId || '') })
      queryClient.invalidateQueries({ queryKey: vendorKeys.dropdown(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Vendor restored successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore vendor',
        variant: 'destructive',
      })
    },
  })
}
