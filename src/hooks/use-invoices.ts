'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  cancelInvoice,
  getCustomersForDropdown,
  getItemsForDropdown,
} from '@/app/actions/invoice-actions'
import { InvoiceFormValues, InvoiceFiltersValues } from '@/lib/validations/invoice'
import { InvoiceStatus } from '@prisma/client'
import { useToast } from '@/components/ui/use-toast'

// Query keys
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters?: Partial<InvoiceFiltersValues>) =>
    [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  customers: ['customers', 'dropdown'] as const,
  items: ['items', 'dropdown'] as const,
}

/**
 * Hook to fetch invoices with filters
 */
export function useInvoices(filters?: Partial<InvoiceFiltersValues>) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const result = await getInvoices(filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })
}

/**
 * Hook to fetch a single invoice
 */
export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const result = await getInvoice(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch customers for dropdown
 */
export function useCustomersDropdown() {
  return useQuery({
    queryKey: invoiceKeys.customers,
    queryFn: async () => {
      const result = await getCustomersForDropdown()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })
}

/**
 * Hook to fetch items for dropdown
 */
export function useItemsDropdown() {
  return useQuery({
    queryKey: invoiceKeys.items,
    queryFn: async () => {
      const result = await getItemsForDropdown()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })
}

/**
 * Hook to create an invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const result = await createInvoice(data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update an invoice
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InvoiceFormValues }) => {
      const result = await updateInvoice(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update invoice status
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const result = await updateInvoiceStatus(id, status)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Invoice status updated',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to cancel an invoice
 */
export function useCancelInvoice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await cancelInvoice(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      toast({
        title: 'Success',
        description: 'Invoice cancelled',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel invoice',
        variant: 'destructive',
      })
    },
  })
}
