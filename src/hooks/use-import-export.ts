'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  importPtbAction,
  exportCustomersToCSV,
  exportVendorsToCSV,
  exportChartOfAccountsToCSV,
  exportJournalEntriesToCSV,
} from '@/app/actions/peachtree-import-export'
import { useToast } from '@/components/ui/use-toast'
import { analyzeImportedData } from '@/lib/gemini-service'

// ... existing code ...

/**
 * Hook to export customers to CSV
 */
export function useExportCustomers() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const result = await exportCustomersToCSV()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (csvData) => {
      // Download the CSV file
      const blob = new Blob([csvData!], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export Successful',
        description: 'Customers exported to CSV',
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
 * Hook to export vendors to CSV
 */
export function useExportVendors() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const result = await exportVendorsToCSV()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (csvData) => {
      const blob = new Blob([csvData!], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `vendors_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export Successful',
        description: 'Vendors exported to CSV',
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
 * Hook to export Journal Entries to CSV
 */
export function useExportJournalEntries() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const result = await exportJournalEntriesToCSV()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (csvData) => {
      const blob = new Blob([csvData!], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `journal_entries_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export Successful',
        description: 'Journal Entries exported to CSV',
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
 * Hook to export chart of accounts to CSV
 */
export function useExportChartOfAccounts() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const result = await exportChartOfAccountsToCSV()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (csvData) => {
      const blob = new Blob([csvData!], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chart_of_accounts_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export Successful',
        description: 'Chart of Accounts exported to CSV',
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
 * Hook to export full PTB backup file
 */
export function useExportToPtb() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      // Dynamic import to avoid circular dependencies if any, or just direct import
      const { generatePtbBackup } = await import('@/app/actions/backup-actions')
      const result = await generatePtbBackup()
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
