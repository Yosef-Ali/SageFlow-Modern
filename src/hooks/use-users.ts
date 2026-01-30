import { useState, useEffect } from 'react'
import { getCompanyUsers, updateUserRole, inviteUser, deleteUser, type CompanyUser } from '@/app/actions/user-actions'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { ActionResult } from '@/types/api'

export function useUsers() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    if (!user?.companyId) return

    setIsLoading(true)
    const result = await getCompanyUsers(user.companyId)
    if (result.success && result.data) {
      setUsers(result.data)
      setError(null)
    } else {
      setError(result.error || 'Failed to fetch users')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [user?.companyId])

  const changeRole = async (userId: string, role: string) => {
    const result = await updateUserRole(userId, role)
    if (result.success) {
      toast({ title: 'Success', description: 'User role updated' })
      fetchUsers()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
    return result
  }

  const removeUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return

    const result = await deleteUser(userId)
    if (result.success) {
      toast({ title: 'Success', description: 'User removed' })
      fetchUsers()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
    return result
  }

  const invite = async (email: string, name: string, role: string) => {
    if (!user?.companyId) return { success: false, error: 'No company ID' } as ActionResult<void>

    const result = await inviteUser({ email, name, role, companyId: user.companyId })
    if (result.success) {
      toast({ title: 'Success', description: 'User invited' })
      fetchUsers()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
    return result
  }

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    changeRole,
    removeUser,
    invite
  }
}
