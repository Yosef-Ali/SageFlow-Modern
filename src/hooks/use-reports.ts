'use client'

import { useQuery } from '@tanstack/react-query'
import { getProfitLoss, getBalanceSheet } from '@/app/actions/report-actions'

export function useProfitLoss(from?: Date, to?: Date) {
  return useQuery({
    queryKey: ['reports', 'profit-loss', from?.toISOString(), to?.toISOString()],
    queryFn: () => getProfitLoss(from, to),
  })
}

export function useBalanceSheet(asOf?: Date) {
  return useQuery({
    queryKey: ['reports', 'balance-sheet', asOf?.toISOString()],
    queryFn: () => getBalanceSheet(asOf),
  })
}
