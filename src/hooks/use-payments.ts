'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getUnpaidInvoicesForCustomer,
} from '@/app/actions/payment-actions'
import { PaymentFormValues, PaymentFiltersValues } from '@/lib/validations/payment'
import { useToast } from '@/components/ui/use-toast'
import { invoiceKeys } from './use-invoices'

// Query keys
export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters?: Partial<PaymentFiltersValues>) =>
    [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  unpaidInvoices: (customerId: string) => ['unpaid-invoices', customerId] as const,
}

/**
 * Hook to fetch payments with filters
 */
export function usePayments(filters?: Partial<PaymentFiltersValues>) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: async () => {
      const result = await getPayments(filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
  })
}

/**
 * Hook to fetch a single payment
 */
export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: async () => {
      const result = await getPayment(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch unpaid invoices for a customer
 */
export function useUnpaidInvoices(customerId: string) {
  return useQuery({
    queryKey: paymentKeys.unpaidInvoices(customerId),
    queryFn: async () => {
      const result = await getUnpaidInvoicesForCustomer(customerId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!customerId,
  })
}

/**
 * Hook to create a payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const result = await createPayment(data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update a payment
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PaymentFormValues }) => {
      const result = await updatePayment(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      toast({
        title: 'Success',
        description: 'Payment updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete a payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deletePayment(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
      toast({
        title: 'Success',
        description: 'Payment deleted',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payment',
        variant: 'destructive',
      })
    },
  })
}
