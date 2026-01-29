import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  importCustomersCSV, 
  importVendorsCSV, 
  importAccountsCSV,
  importCSVAuto,
  type CSVImportResult,
  type CSVImportType,
} from '@/lib/peachtree/csv-import-service'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook to import Customers from CSV
 */
export function useImportCustomersCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: importCustomersCSV,
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

  return useMutation({
    mutationFn: importVendorsCSV,
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

  return useMutation({
    mutationFn: importAccountsCSV,
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
 * Generic hook for CSV import with type selection
 */
export function useImportCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: CSVImportType }): Promise<CSVImportResult> => {
      switch (type) {
        case 'customers':
          return importCustomersCSV(file);
        case 'vendors':
          return importVendorsCSV(file);
        case 'accounts':
          return importAccountsCSV(file);
        case 'auto':
        default:
          return importCSVAuto(file);
      }
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (data.type === 'customers' || data.type === 'auto') {
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      }
      if (data.type === 'vendors' || data.type === 'auto') {
        queryClient.invalidateQueries({ queryKey: ['vendors'] })
      }
      if (data.type === 'accounts' || data.type === 'auto') {
        queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      }

      if (data.success && data.imported > 0) {
        const typeLabel = data.type === 'customers' ? 'customers' :
                          data.type === 'vendors' ? 'vendors' :
                          data.type === 'accounts' ? 'accounts' : 'records';
        toast({
          title: 'Import Successful',
          description: `Imported ${data.imported} ${typeLabel}`,
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
