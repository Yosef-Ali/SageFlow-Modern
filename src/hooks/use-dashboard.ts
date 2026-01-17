'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getMonthlyRevenue,
  getRecentInvoices,
  getPendingPayments,
} from '@/app/actions/dashboard-actions'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  revenue: () => [...dashboardKeys.all, 'revenue'] as const,
  recentInvoices: () => [...dashboardKeys.all, 'recent-invoices'] as const,
  pendingPayments: () => [...dashboardKeys.all, 'pending-payments'] as const,
}

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const result = await getDashboardStats()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: dashboardKeys.revenue(),
    queryFn: async () => {
      const result = await getMonthlyRevenue()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useRecentInvoices() {
  return useQuery({
    queryKey: dashboardKeys.recentInvoices(),
    queryFn: async () => {
      const result = await getRecentInvoices()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function usePendingPayments() {
  return useQuery({
    queryKey: dashboardKeys.pendingPayments(),
    queryFn: async () => {
      const result = await getPendingPayments()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}
