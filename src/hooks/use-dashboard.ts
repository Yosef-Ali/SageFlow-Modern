'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getMonthlyRevenue,
  getRecentInvoices,
  getPendingPayments,
} from '@/app/actions/dashboard-actions'
import { useAuth } from '@/lib/auth-context'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (companyId: string) => [...dashboardKeys.all, 'stats', companyId] as const,
  revenue: () => [...dashboardKeys.all, 'revenue'] as const,
  recentInvoices: (companyId: string) => [...dashboardKeys.all, 'recent-invoices', companyId] as const,
  pendingPayments: () => [...dashboardKeys.all, 'pending-payments'] as const,
}

export function useDashboardStats() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: dashboardKeys.stats(companyId),
    queryFn: async () => {
      const result = await getDashboardStats(companyId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!companyId,
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
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: dashboardKeys.recentInvoices(companyId),
    queryFn: async () => {
      const result = await getRecentInvoices(companyId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!companyId,
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
