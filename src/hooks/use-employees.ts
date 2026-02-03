'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  EmployeeFormValues,
} from '@/app/actions/employee-actions'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

// Query keys
export const employeeKeys = {
  all: ['employees'] as const,
  lists: (companyId: string) => [...employeeKeys.all, 'list', companyId] as const,
  list: (companyId: string, filters?: { search?: string }) => [...employeeKeys.lists(companyId), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
}

/**
 * Hook to fetch all employees
 */
export function useEmployees(filters?: { search?: string }) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: employeeKeys.list(companyId, filters),
    queryFn: async () => {
      if (!companyId) return []
      const result = await getEmployees(companyId, filters)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch single employee
 */
export function useEmployee(id: string) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const result = await getEmployee(id, companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id && !!companyId,
  })
}

/**
 * Hook to create employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      if (!companyId) throw new Error('Company ID required')
      const result = await createEmployee(data, companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists(companyId) })
      toast({
        title: 'Success',
        description: 'Employee created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create employee',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeFormValues }) => {
      const result = await updateEmployee(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (_: unknown, variables: { id: string; data: EmployeeFormValues }) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) })
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteEmployee(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists(companyId) })
      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete employee',
        variant: 'destructive',
      })
    },
  })
}
