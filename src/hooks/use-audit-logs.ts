import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/app/actions/audit-actions'
import { useAuth } from '@/lib/auth-context'

export function useAuditLogs(limit = 50) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['audit-logs', user?.companyId, limit],
    queryFn: async () => {
      if (!user?.companyId) return []
      const result = await getAuditLogs(user.companyId, limit)
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to fetch audit logs')
    },
    enabled: !!user?.companyId,
  })
}
