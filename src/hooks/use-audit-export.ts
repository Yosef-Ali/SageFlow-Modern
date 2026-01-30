/**
 * Audit Export Hooks - Ethiopian Customs & ERCA Compliant
 * ለኢትዮጵያ ጉምሩክና ገቢዎች ባለስልጣን ኦዲት
 */

import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import {
  exportJournalEntriesCSV,
  exportInvoicesCSV,
  exportTrialBalanceCSV,
  exportBankTransactionsCSV,
  exportCustomersWithTinCSV,
  exportVendorsWithTinCSV,
  generateFullAuditPackage,
} from '@/app/actions/audit-export-actions'

// Helper to download CSV
function downloadCSV(csvData: string, filename: string) {
  const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export Journal Entries / General Ledger
 */
export function useExportAuditJournalEntries() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await exportJournalEntriesCSV(companyId, dateFrom, dateTo)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (csvData) => {
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(csvData!, `journal_entries_${date}.csv`)
      toast({
        title: 'Export Successful / ወጪ ተሳክቷል',
        description: 'Journal entries exported for audit',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Export Invoices with VAT
 */
export function useExportAuditInvoices() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await exportInvoicesCSV(companyId, dateFrom, dateTo)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (csvData) => {
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(csvData!, `invoices_vat_${date}.csv`)
      toast({
        title: 'Export Successful / ወጪ ተሳክቷል',
        description: 'Invoices with VAT exported for ERCA',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Export Trial Balance
 */
export function useExportAuditTrialBalance() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await exportTrialBalanceCSV(companyId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (csvData) => {
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(csvData!, `trial_balance_${date}.csv`)
      toast({
        title: 'Export Successful / ወጪ ተሳክቷል',
        description: 'Trial balance exported',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Export Bank Transactions
 */
export function useExportAuditBankTransactions() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await exportBankTransactionsCSV(companyId, dateFrom, dateTo)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (csvData) => {
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(csvData!, `bank_transactions_${date}.csv`)
      toast({
        title: 'Export Successful / ወጪ ተሳክቷል',
        description: 'Bank transactions exported',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Export Customers with TIN
 */
export function useExportAuditCustomersWithTin() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await exportCustomersWithTinCSV(companyId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (csvData) => {
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(csvData!, `customers_tin_${date}.csv`)
      toast({
        title: 'Export Successful / ወጪ ተሳክቷል',
        description: 'Customers with TIN exported',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Export Vendors with TIN
 */
export function useExportAuditVendorsWithTin() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await exportVendorsWithTinCSV(companyId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (csvData) => {
      const date = new Date().toISOString().split('T')[0]
      downloadCSV(csvData!, `vendors_tin_${date}.csv`)
      toast({
        title: 'Export Successful / ወጪ ተሳክቷል',
        description: 'Vendors with TIN exported',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Generate Full Audit Package
 */
export function useGenerateAuditPackage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  return useMutation({
    mutationFn: async ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => {
      if (!companyId) throw new Error('Company ID is required')
      const result = await generateFullAuditPackage(companyId, dateFrom, dateTo)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      const date = new Date().toISOString().split('T')[0]
      
      // Download each file
      if (data?.journalEntries) downloadCSV(data.journalEntries, `audit_journal_${date}.csv`)
      if (data?.invoices) downloadCSV(data.invoices, `audit_invoices_${date}.csv`)
      if (data?.trialBalance) downloadCSV(data.trialBalance, `audit_trial_balance_${date}.csv`)
      if (data?.bankTransactions) downloadCSV(data.bankTransactions, `audit_bank_${date}.csv`)
      if (data?.customers) downloadCSV(data.customers, `audit_customers_${date}.csv`)
      if (data?.vendors) downloadCSV(data.vendors, `audit_vendors_${date}.csv`)

      toast({
        title: 'Audit Package Generated / የኦዲት ፓኬጅ ተፈጥሯል',
        description: '6 audit reports downloaded',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' })
    },
  })
}
