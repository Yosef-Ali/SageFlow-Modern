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
 * Hook to export full PTB backup file
 */
export function useExportToPtb() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      // Dynamic import to avoid circular dependencies if any, or just direct import
      const { generatePtbBackup } = await import('@/app/actions/backup-actions')
      const result = await generatePtbBackup(companyId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (zipBase64) => {
      // Decode base64 to blob
      const binaryString = window.atob(zipBase64 as string)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/zip' })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `SageFlow_Backup_${new Date().toISOString().split('T')[0]}.ptb`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export Successful',
        description: 'Peachtree backup file (.ptb) downloaded',
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
