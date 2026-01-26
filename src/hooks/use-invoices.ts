'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  cancelInvoice,
  deleteInvoice,
  getCustomersForDropdown,
  getItemsForDropdown,
  getInvoicesSummary,
} from '@/services/invoice-service'
import { InvoiceFormValues, InvoiceFiltersValues } from '@/lib/validations/invoice'
import { InvoiceStatus } from '@/db/schema'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

// Query keys factory
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (companyId: string, filters?: Partial<InvoiceFiltersValues>) =>
    [...invoiceKeys.lists(), companyId, filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  summary: (companyId: string) => [...invoiceKeys.all, 'summary', companyId] as const,
  customers: (companyId: string) => ['customers', 'dropdown', companyId] as const,
  items: (companyId: string) => ['items', 'dropdown', companyId] as const,
}

/**
 * Hook to fetch invoices with filters
 */
export function useInvoices(filters?: Partial<InvoiceFiltersValues>) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: invoiceKeys.list(companyId, filters),
    queryFn: async () => {
      if (!companyId) {
        return { invoices: [], total: 0 }
      }
      const result = await getInvoices(companyId, filters)
      if (!result.success) {
        console.error(result.error)
        return { invoices: [], total: 0 }
      }
      return result.data
    },
    enabled: !!companyId,
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
 * Hook to fetch invoice summary stats
 */
export function useInvoicesSummary() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: invoiceKeys.summary(companyId),
    queryFn: async () => {
      if (!companyId) {
        return {
          total: 0,
          draft: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
          totalAmount: 0,
          paidAmount: 0,
          outstandingAmount: 0,
        }
      }
      const result = await getInvoicesSummary(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch customers for dropdown
 */
export function useCustomersDropdown() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: invoiceKeys.customers(companyId),
    queryFn: async () => {
      if (!companyId) return []
      const result = await getCustomersForDropdown(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch items for dropdown
 */
export function useItemsDropdown() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: invoiceKeys.items(companyId),
    queryFn: async () => {
      if (!companyId) return []
      const result = await getItemsForDropdown(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to create an invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      if (!user?.companyId) {
        throw new Error('Not authenticated')
      }
      const result = await createInvoice(user.companyId, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.summary(user?.companyId || '') })
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
  const { user } = useAuth()

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
      queryClient.invalidateQueries({ queryKey: invoiceKeys.summary(user?.companyId || '') })
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
  const { user } = useAuth()

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
      queryClient.invalidateQueries({ queryKey: invoiceKeys.summary(user?.companyId || '') })
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
  const { user } = useAuth()

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
      queryClient.invalidateQueries({ queryKey: invoiceKeys.summary(user?.companyId || '') })
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
/**
 * Hook to delete an invoice
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteInvoice(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.summary(user?.companyId || '') })
      toast({
        title: 'Success',
        description: 'Invoice deleted permanently',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive',
      })
    },
  })
}
