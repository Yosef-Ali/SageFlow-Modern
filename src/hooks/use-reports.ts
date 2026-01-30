'use client'

import { useQuery } from '@tanstack/react-query'
import { getGeneralLedger, getGLSummary, GLFilterValues } from '@/app/actions/report-actions'
import { useAuth } from '@/lib/auth-context'

export const reportKeys = {
  all: ['reports'] as const,
  gl: (companyId: string, filters?: GLFilterValues) => [...reportKeys.all, 'gl', companyId, filters] as const,
  glSummary: (filters?: GLFilterValues) => [...reportKeys.all, 'gl-summary', filters] as const,
}

export function useGeneralLedger(filters?: GLFilterValues) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: reportKeys.gl(companyId, filters),
    queryFn: async () => {
      const result = await getGeneralLedger(companyId, filters)
      if (!result.success) throw new Error(result.error || 'Failed to fetch report')
      return result.data
    },
    enabled: !!companyId,
  })
}

export function useGLSummary(filters?: GLFilterValues) {
  return useQuery({
    queryKey: reportKeys.glSummary(filters),
    queryFn: async () => {
      const result = await getGLSummary(filters)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}
