/**
 * CSV Exporter Module
 *
 * Export data to Sage 50/Peachtree compatible CSV format.
 * All exports require companyId for multi-tenant isolation.
 */

import { supabase } from '@/lib/supabase'
import type { ExportResult, DataType } from './types'
import {
  SAGE50_CUSTOMER_HEADERS,
  SAGE50_VENDOR_HEADERS,
  SAGE50_ACCOUNT_HEADERS,
  SAGE50_ITEM_HEADERS,
  SAGE50_EMPLOYEE_HEADERS
} from './types'

// ============================================
// HELPERS
// ============================================

/**
 * Format a row for Sage 50 CSV (Windows line endings, quoted fields)
 */
function formatCSVRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map(cell => {
      const value = String(cell ?? '')
      // Escape double quotes and wrap in quotes
      return `"${value.replace(/"/g, '""')}"`
    })
    .join(',')
}

/**
 * Build CSV string from headers and rows
 */
function buildCSV(headers: readonly string[], rows: (string | number | null | undefined)[][]): string {
  const headerRow = headers.join(',')
  const dataRows = rows.map(formatCSVRow)
  return [headerRow, ...dataRows].join('\r\n') // Windows line endings for Peachtree
}

/**
 * Generate filename with date
 */
function generateFilename(type: DataType): string {
  const date = new Date().toISOString().split('T')[0]
  return `sageflow_${type}_${date}.csv`
}

/**
 * Map internal account type to Sage 50 type
 */
function mapAccountType(type: string): string {
  const typeMap: Record<string, string> = {
    'ASSET': 'Cash',
    'LIABILITY': 'Accounts Payable',
    'EQUITY': "Equity-doesn't close",
    'REVENUE': 'Income',
    'EXPENSE': 'Expenses'
  }
  return typeMap[type] || 'Other Current Assets'
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export Customers to CSV
 */
export async function exportCustomers(companyId: string): Promise<ExportResult> {
  try {
    if (!companyId) {
      return { success: false, type: 'customers', data: '', filename: '', count: 0, error: 'Company ID required' }
    }

    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('customer_number')

    if (error) throw error
    if (!customers?.length) {
      return { success: false, type: 'customers', data: '', filename: '', count: 0, error: 'No customers found' }
    }

    const rows = customers.map(c => [
      c.customer_number || '',
      c.name || '',
      c.contact_name || '',
      c.billing_address?.street || '',
      c.billing_address?.city || '',
      c.billing_address?.state || '',
      c.billing_address?.zipCode || '',
      c.billing_address?.country || 'Ethiopia',
      c.phone || '',
      c.email || '',
      c.tax_id || '',
      c.customer_type || 'RETAIL',
      c.payment_terms || 'Net 30 Days',
      c.credit_limit || 0
    ])

    const csv = buildCSV(SAGE50_CUSTOMER_HEADERS, rows)

    return {
      success: true,
      type: 'customers',
      data: csv,
      filename: generateFilename('customers'),
      count: customers.length
    }
  } catch (error: any) {
    return { success: false, type: 'customers', data: '', filename: '', count: 0, error: error.message }
  }
}

/**
 * Export Vendors to CSV
 */
export async function exportVendors(companyId: string): Promise<ExportResult> {
  try {
    if (!companyId) {
      return { success: false, type: 'vendors', data: '', filename: '', count: 0, error: 'Company ID required' }
    }

    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('vendor_number')

    if (error) throw error
    if (!vendors?.length) {
      return { success: false, type: 'vendors', data: '', filename: '', count: 0, error: 'No vendors found' }
    }

    const rows = vendors.map(v => [
      v.vendor_number || '',
      v.name || '',
      v.contact_name || '',
      v.address?.street || '',
      v.address?.city || '',
      v.address?.state || '',
      v.address?.zipCode || '',
      v.address?.country || 'Ethiopia',
      v.phone || '',
      v.email || '',
      v.tax_id || '',
      v.vendor_type || 'Trade',
      v.payment_terms || 'Net 30 Days',
      '' // 1099 Type - blank for international
    ])

    const csv = buildCSV(SAGE50_VENDOR_HEADERS, rows)

    return {
      success: true,
      type: 'vendors',
      data: csv,
      filename: generateFilename('vendors'),
      count: vendors.length
    }
  } catch (error: any) {
    return { success: false, type: 'vendors', data: '', filename: '', count: 0, error: error.message }
  }
}

/**
 * Export Chart of Accounts to CSV
 */
export async function exportAccounts(companyId: string): Promise<ExportResult> {
  try {
    if (!companyId) {
      return { success: false, type: 'accounts', data: '', filename: '', count: 0, error: 'Company ID required' }
    }

    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('account_number')

    if (error) throw error
    if (!accounts?.length) {
      return { success: false, type: 'accounts', data: '', filename: '', count: 0, error: 'No accounts found' }
    }

    const rows = accounts.map(a => [
      a.account_number || '',
      a.account_name || '',
      mapAccountType(a.type),
      a.is_active ? 'FALSE' : 'TRUE'
    ])

    const csv = buildCSV(SAGE50_ACCOUNT_HEADERS, rows)

    return {
      success: true,
      type: 'accounts',
      data: csv,
      filename: generateFilename('accounts'),
      count: accounts.length
    }
  } catch (error: any) {
    return { success: false, type: 'accounts', data: '', filename: '', count: 0, error: error.message }
  }
}

/**
 * Export Inventory Items to CSV
 */
export async function exportItems(companyId: string): Promise<ExportResult> {
  try {
    if (!companyId) {
      return { success: false, type: 'items', data: '', filename: '', count: 0, error: 'Company ID required' }
    }

    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sku')

    if (error) throw error
    if (!items?.length) {
      return { success: false, type: 'items', data: '', filename: '', count: 0, error: 'No items found' }
    }

    const rows = items.map(item => [
      item.sku || '',
      item.name || '',
      item.type === 'SERVICE' ? 'Service' : 'Stock item',
      item.type === 'SERVICE' ? 'Labor' : 'Stock item',
      item.description || item.name || '',
      item.selling_price || 0,
      'Average',
      item.cost_price || 0,
      item.quantity_on_hand || 0,
      item.reorder_quantity || 0,
      item.reorder_point || 0,
      item.taxable !== false ? '1' : '2',
      item.barcode || item.sku || '',
      item.unit_of_measure || 'Each'
    ])

    const csv = buildCSV(SAGE50_ITEM_HEADERS, rows)

    return {
      success: true,
      type: 'items',
      data: csv,
      filename: generateFilename('items'),
      count: items.length
    }
  } catch (error: any) {
    return { success: false, type: 'items', data: '', filename: '', count: 0, error: error.message }
  }
}

/**
 * Export Employees to CSV
 */
export async function exportEmployees(companyId: string): Promise<ExportResult> {
  try {
    if (!companyId) {
      return { success: false, type: 'employees', data: '', filename: '', count: 0, error: 'Company ID required' }
    }

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('employee_code')

    if (error) throw error
    if (!employees?.length) {
      return { success: false, type: 'employees', data: '', filename: '', count: 0, error: 'No employees found' }
    }

    const rows = employees.map(emp => [
      emp.employee_code || '',
      `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      emp.address?.street || '',
      emp.address?.city || '',
      emp.address?.state || '',
      emp.address?.zipCode || '',
      emp.phone || '',
      emp.email || '',
      emp.ssn || emp.tax_id || '',
      emp.pay_method || 'Hourly',
      emp.pay_frequency || 'Weekly',
      emp.pay_rate || 0
    ])

    const csv = buildCSV(SAGE50_EMPLOYEE_HEADERS, rows)

    return {
      success: true,
      type: 'employees',
      data: csv,
      filename: generateFilename('employees'),
      count: employees.length
    }
  } catch (error: any) {
    return { success: false, type: 'employees', data: '', filename: '', count: 0, error: error.message }
  }
}

/**
 * Export Journal Entries to CSV
 */
export async function exportJournalEntries(companyId: string): Promise<ExportResult> {
  try {
    if (!companyId) {
      return { success: false, type: 'accounts', data: '', filename: '', count: 0, error: 'Company ID required' }
    }

    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_lines (
          *,
          account:chart_of_accounts (account_number, account_name)
        )
      `)
      .eq('company_id', companyId)
      .order('date')

    if (error) throw error
    if (!entries?.length) {
      return { success: false, type: 'accounts', data: '', filename: '', count: 0, error: 'No journal entries found' }
    }

    const headers = ['Date', 'Reference', 'GL Account', 'Description', 'Debit Amount', 'Credit Amount']
    const rows: (string | number)[][] = []

    entries.forEach((entry: any) => {
      const dateObj = new Date(entry.date)
      const dateStr = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`

      if (entry.lines?.length > 0) {
        entry.lines.forEach((line: any) => {
          const debit = parseFloat(line.debit || '0')
          const credit = parseFloat(line.credit || '0')

          rows.push([
            dateStr,
            entry.reference || `JE-${entry.id?.substring(0, 8) || 'REF'}`,
            line.account?.account_number || line.account_id || '',
            line.description || entry.description || '',
            debit > 0 ? debit.toFixed(2) : '',
            credit > 0 ? credit.toFixed(2) : ''
          ])
        })
      }
    })

    const csv = buildCSV(headers, rows)

    return {
      success: true,
      type: 'accounts',
      data: csv,
      filename: `sageflow_journal_${new Date().toISOString().split('T')[0]}.csv`,
      count: rows.length
    }
  } catch (error: any) {
    return { success: false, type: 'accounts', data: '', filename: '', count: 0, error: error.message }
  }
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
