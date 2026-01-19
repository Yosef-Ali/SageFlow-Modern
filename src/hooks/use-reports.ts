'use client'

import { useQuery } from '@tanstack/react-query'
import { getGeneralLedger, getGLSummary, GLFilterValues } from '@/app/actions/report-actions'

export const reportKeys = {
  all: ['reports'] as const,
  gl: (filters?: GLFilterValues) => [...reportKeys.all, 'gl', filters] as const,
  glSummary: (filters?: GLFilterValues) => [...reportKeys.all, 'gl-summary', filters] as const,
}

export function useGeneralLedger(filters?: GLFilterValues) {
  return useQuery({
    queryKey: reportKeys.gl(filters),
    queryFn: async () => {
      const result = await getGeneralLedger(filters)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
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
