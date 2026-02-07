/**
 * CSV Export Hooks
 *
 * React Query hooks for exporting data to CSV.
 * Uses the consolidated csv module.
 */

import { useMutation } from '@tanstack/react-query'
import {
  exportCustomers,
  exportVendors,
  exportAccounts,
  exportItems,
  exportEmployees,
  exportJournalEntries,
  downloadCSV,
  type ExportResult
} from '@/lib/csv'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { analyzeImportedData } from '@/lib/gemini-service'

/**
 * Generic export handler
 */
function useExportMutation(
  exportFn: (companyId: string) => Promise<ExportResult>,
  label: string
) {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await exportFn(companyId)
      if (!result.success) {
        throw new Error(result.error || `No ${label} found`)
      }
      return result
    },
    onSuccess: (result) => {
      downloadCSV(result.data, result.filename)
      toast({
        title: 'Export Successful',
        description: `${result.count} ${label} exported to CSV`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to export customers to CSV
 */
export function useExportCustomers() {
  return useExportMutation(exportCustomers, 'customers')
}

/**
 * Hook to export vendors to CSV
 */
export function useExportVendors() {
  return useExportMutation(exportVendors, 'vendors')
}

/**
 * Hook to export chart of accounts to CSV
 */
export function useExportChartOfAccounts() {
  return useExportMutation(exportAccounts, 'accounts')
}

/**
 * Hook to export inventory items to CSV
 */
export function useExportItems() {
  return useExportMutation(exportItems, 'items')
}

/**
 * Hook to export employees to CSV
 */
export function useExportEmployees() {
  return useExportMutation(exportEmployees, 'employees')
}

/**
 * Hook to export journal entries to CSV
 */
export function useExportJournalEntries() {
  return useExportMutation(exportJournalEntries, 'journal entries')
}

/**
 * Hook to export full PTB backup file (browser-compatible)
 */
export function useExportToPtb() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const { generatePtbBackup } = await import('@/lib/peachtree/ptb-export-service')
      const result = await generatePtbBackup(companyId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async (result) => {
      const { downloadPtbBackup } = await import('@/lib/peachtree/ptb-export-service')
      downloadPtbBackup(result)

      toast({
        title: 'Export Successful / ስኬታማ!',
        description: `Backup downloaded: ${result.counts?.customers || 0} customers, ${result.counts?.vendors || 0} vendors, ${result.counts?.accounts || 0} accounts`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to analyze imported data samples with AI
 */
export function useAnalyzeImport() {
  return useMutation({
    mutationFn: async (samples: { customers: string[]; vendors: string[]; accounts: string[] }) => {
      const result = await analyzeImportedData(samples)
      if (result.error) throw new Error(result.error)
      return result.analysis
    },
  })
}
