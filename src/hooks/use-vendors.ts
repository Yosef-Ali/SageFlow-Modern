'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorsSummary,
  VendorFormValues,
} from '@/app/actions/vendor-actions'
import { useToast } from '@/components/ui/use-toast'

// Query keys
export const vendorKeys = {
  all: ['vendors'] as const,
  list: (filters?: { search?: string; active?: boolean }) => [...vendorKeys.all, 'list', filters] as const,
  detail: (id: string) => [...vendorKeys.all, 'detail', id] as const,
  summary: () => [...vendorKeys.all, 'summary'] as const,
}

export function useVendors(filters?: { search?: string; active?: boolean }) {
  return useQuery({
    queryKey: vendorKeys.list(filters),
    queryFn: async () => {
      const result = await getVendors(filters)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: async () => {
      const result = await getVendor(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!id,
  })
}

export function useVendorsSummary() {
  return useQuery({
    queryKey: vendorKeys.summary(),
    queryFn: async () => {
      const result = await getVendorsSummary()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const result = await createVendor(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all })
      toast({ title: 'Success', description: 'Vendor created successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorFormValues }) => {
      const result = await updateVendor(id, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all })
      toast({ title: 'Success', description: 'Vendor updated successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteVendor(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all })
      toast({ title: 'Success', description: 'Vendor deleted successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })
}
