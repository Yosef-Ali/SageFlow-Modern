import { useState, useEffect } from 'react'
import { getCompanyProfile, updateCompanyProfile, type CompanyProfile } from '@/app/actions/company-actions'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/use-toast'

export function useCompany() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompany = async () => {
    if (!user?.companyId) return

    setIsLoading(true)
    const result = await getCompanyProfile(user.companyId)
    if (result.success && result.data) {
      setCompany(result.data)
      setError(null)
    } else {
      setError(result.error || 'Failed to fetch company profile')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCompany()
  }, [user?.companyId])

  const updateProfile = async (updates: Partial<CompanyProfile>) => {
    if (!user?.companyId) return

    const result = await updateCompanyProfile(user.companyId, updates)
    if (result.success) {
      toast({ title: 'Success', description: 'Company profile updated' })
      fetchCompany()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
    return result
  }

  return {
    company,
    isLoading,
    error,
    fetchCompany,
    updateProfile
  }
}
