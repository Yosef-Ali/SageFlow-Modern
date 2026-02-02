/**
 * CSV Import Hooks
 *
 * React Query hooks for importing CSV data.
 * Uses the consolidated csv module.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  importCSV,
  importCustomers,
  importVendors,
  importAccounts,
  importItems,
  importEmployees,
  type ImportResult,
  type DataType
} from '@/lib/csv'
import { useToast } from '@/components/ui/use-toast'
import { useCompany } from '@/hooks/use-company'

// Legacy type alias for backwards compatibility
export type CSVImportType = DataType | 'inventory' | 'auto'
export type CSVImportResult = ImportResult

/**
 * Main hook for CSV import with type selection
 * Requires company context for multi-tenancy
 */
export function useImportCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { company } = useCompany()

  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: CSVImportType }): Promise<ImportResult> => {
      if (!company?.id) {
        return {
          success: false,
          type: 'customers',
          imported: 0,
          skipped: 0,
          total: 0,
          errors: ['No company selected. Please select a company first.'],
          samples: []
        }
      }

      // Map legacy 'inventory' type to 'items'
      const mappedType: DataType | 'auto' = type === 'inventory' ? 'items' : type as DataType | 'auto'
      return importCSV(company.id, file, mappedType)
    },
    onSuccess: (data) => {
      // Invalidate relevant queries based on imported type
      const queryMap: Record<DataType, string[]> = {
        customers: ['customers'],
        vendors: ['vendors'],
        accounts: ['chart-of-accounts', 'accounts'],
        items: ['items', 'inventory'],
        employees: ['employees']
      }

      const queriesToInvalidate = queryMap[data.type] || []
      queriesToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] })
      })

      if (data.success && data.imported > 0) {
        toast({
          title: 'Import Successful',
          description: `Imported ${data.imported} ${data.type}`,
        })
      } else if (!data.success && data.errors.length > 0) {
        toast({
          title: 'Import Failed',
          description: data.errors[0],
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to import Customers from CSV
 */
export function useImportCustomersCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { company } = useCompany()

  return useMutation({
    mutationFn: (file: File) => {
      if (!company?.id) throw new Error('No company selected')
      return importCustomers(company.id, file)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      if (data.success && data.imported > 0) {
        toast({
          title: 'Customers Imported',
          description: `Successfully imported ${data.imported} customers`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to import Vendors from CSV
 */
export function useImportVendorsCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { company } = useCompany()

  return useMutation({
    mutationFn: (file: File) => {
      if (!company?.id) throw new Error('No company selected')
      return importVendors(company.id, file)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      if (data.success && data.imported > 0) {
        toast({
          title: 'Vendors Imported',
          description: `Successfully imported ${data.imported} vendors`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to import Chart of Accounts from CSV
 */
export function useImportAccountsCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { company } = useCompany()

  return useMutation({
    mutationFn: (file: File) => {
      if (!company?.id) throw new Error('No company selected')
      return importAccounts(company.id, file)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      if (data.success && data.imported > 0) {
        toast({
          title: 'Accounts Imported',
          description: `Successfully imported ${data.imported} accounts`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to import Inventory Items from CSV
 */
export function useImportItemsCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { company } = useCompany()

  return useMutation({
    mutationFn: (file: File) => {
      if (!company?.id) throw new Error('No company selected')
      return importItems(company.id, file)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      if (data.success && data.imported > 0) {
        toast({
          title: 'Inventory Imported',
          description: `Successfully imported ${data.imported} items`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to import Employees from CSV
 */
export function useImportEmployeesCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { company } = useCompany()

  return useMutation({
    mutationFn: (file: File) => {
      if (!company?.id) throw new Error('No company selected')
      return importEmployees(company.id, file)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      if (data.success && data.imported > 0) {
        toast({
          title: 'Employees Imported',
          description: `Successfully imported ${data.imported} employees`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
