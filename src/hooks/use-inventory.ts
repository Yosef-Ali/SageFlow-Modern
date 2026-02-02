'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getItemCategories,
  getInventorySummary,
  getAssemblyDefinitions,
  type ItemFormValues,
  type ItemFiltersValues,
} from '@/app/actions/inventory-actions'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

// Query keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: (companyId: string) => [...inventoryKeys.all, 'list', companyId] as const,
  list: (companyId: string, filters?: Partial<ItemFiltersValues>) =>
    [...inventoryKeys.lists(companyId), filters] as const,
  details: () => [...inventoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  categories: (companyId: string) => [...inventoryKeys.all, 'categories', companyId] as const,
  summary: (companyId: string) => [...inventoryKeys.all, 'summary', companyId] as const,
  assemblies: () => [...inventoryKeys.all, 'assemblies'] as const,
}

/**
 * Hook to fetch inventory items with filters
 */
export function useItems(filters?: Partial<ItemFiltersValues>) {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: inventoryKeys.list(companyId, filters),
    queryFn: async () => {
      const result = await getItems(companyId, filters)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch inventory items')
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch a single item
 */
export function useItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: async () => {
      const result = await getItem(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch item categories
 */
export function useItemCategories() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: inventoryKeys.categories(companyId),
    queryFn: async () => {
      const result = await getItemCategories(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch inventory summary
 */
export function useInventorySummary() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useQuery({
    queryKey: inventoryKeys.summary(companyId),
    queryFn: async () => {
      const result = await getInventorySummary(companyId)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch inventory summary')
      }
      return result.data
    },
    enabled: !!companyId,
  })
}

/**
 * Hook to fetch assembly definitions
 */
export function useAssemblyDefinitions() {
  return useQuery({
    queryKey: inventoryKeys.assemblies(),
    queryFn: async () => {
      const result = await getAssemblyDefinitions()
      if (!result.success) {
        console.error(result.error) // Don't throw, prevent white page
        return []
      }
      return result.data
    },
  })
}

/**
 * Hook to create an item
 */
export function useCreateItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const result = await createItem({ ...data, companyId })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.summary(companyId) })
      toast({
        title: 'Success',
        description: 'Item created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create item',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update an item
 */
export function useUpdateItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ItemFormValues }) => {
      const result = await updateItem(id, data)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.summary(companyId) })
      toast({
        title: 'Success',
        description: 'Item updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update item',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete an item
 */
export function useDeleteItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteItem(id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.summary(companyId) })
      toast({
        title: 'Success',
        description: 'Item deleted',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      })
    },
  })
}
