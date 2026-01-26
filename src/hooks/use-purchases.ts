'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  getBills,
  getBill,
  createBill,
  type PurchaseOrderFormValues,
  type BillFormValues
} from '@/app/actions/purchase-actions'
import { useToast } from '@/components/ui/use-toast'

export const purchaseKeys = {
  all: ['purchases'] as const,
  orders: () => [...purchaseKeys.all, 'orders'] as const,
  order: (id: string) => [...purchaseKeys.orders(), id] as const,
  bills: () => [...purchaseKeys.all, 'bills'] as const,
  bill: (id: string) => [...purchaseKeys.bills(), id] as const,
}

// ============ Purchase Orders Hooks ============

export function usePurchaseOrders(filters?: { status?: string; vendorId?: string }) {
  return useQuery({
    queryKey: [...purchaseKeys.orders(), filters],
    queryFn: async () => {
      const result = await getPurchaseOrders(filters)
      if (!result.success) {
        console.error(result.error)
        return [] // Safe default
      }
      return result.data
    },
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: purchaseKeys.order(id),
    queryFn: async () => {
      const result = await getPurchaseOrder(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: PurchaseOrderFormValues) => {
      const result = await createPurchaseOrder(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.orders() })
      toast({ title: 'Success', description: 'Purchase Order created' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  })
}

// ============ Bills Hooks ============

export function useBills(filters?: { status?: string; vendorId?: string }) {
  return useQuery({
    queryKey: [...purchaseKeys.bills(), filters],
    queryFn: async () => {
      const result = await getBills(filters)
      if (!result.success) {
        console.error(result.error)
        return [] // Safe default
      }
      return result.data
    },
  })
}

export function useBill(id: string) {
  return useQuery({
    queryKey: purchaseKeys.bill(id),
    queryFn: async () => {
      const result = await getBill(id)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!id,
  })
}

export function useCreateBill() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: BillFormValues) => {
      const result = await createBill(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() })
      toast({ title: 'Success', description: 'Bill created' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  })
}
