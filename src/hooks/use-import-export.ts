'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  importFromPtbFile,
  exportCustomersToCSV,
  exportVendorsToCSV,
  exportChartOfAccountsToCSV,
  importCustomersFromCSV,
  previewPtbFile,
} from '@/app/actions/peachtree-import-export'
import { useToast } from '@/components/ui/use-toast'

// Query keys
export const importExportKeys = {
  all: ['import-export'] as const,
}

/**
 * Hook to import from PTB file
 */
export function useImportPtb() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (file: File) => {
      const buffer = await file.arrayBuffer()
      const result = await importFromPtbFile(Buffer.from(buffer))
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast({
        title: 'Import Successful',
        description: `Imported ${data?.customers} customers and ${data?.vendors} vendors from Peachtree`,
      })
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
 * Hook to preview PTB file
 */
export function usePreviewPtb() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (file: File) => {
      const buffer = await file.arrayBuffer()
      const result = await previewPtbFile(Buffer.from(buffer))
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onError: (error: Error) => {
      toast({
        title: 'Preview Failed',
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
 * Hook to import customers from CSV
 */
export function useImportCustomersCSV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text()
      const result = await importCustomersFromCSV(text)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({
        title: 'Import Successful',
        description: `Imported ${data?.imported} customers (${data?.skipped} skipped)`,
      })
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
 * Hook to export full PTB backup file
 */
export function useExportToPtb() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const { exportToPtb } = await import('@/app/actions/ptb-export')
      const result = await exportToPtb()
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (zipBuffer) => {
      // Download the PTB file - handle Buffer properly
      const data = zipBuffer as unknown as { type: 'Buffer'; data: number[] }
      const uint8Array = new Uint8Array(data.data || [])
      const blob = new Blob([uint8Array], { type: 'application/zip' })
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
