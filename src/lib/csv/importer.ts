/**
 * CSV Importer Module
 *
 * Import CSV data to Supabase database.
 * All imports require companyId for multi-tenant isolation.
 */

import { supabase } from '@/lib/supabase'
import type { ImportResult, DataType } from './types'
import {
  parseCustomers,
  parseVendors,
  parseAccounts,
  parseItems,
  parseEmployees,
  detectDataType
} from './parser'

// ============================================
// HELPERS
// ============================================

/**
 * Read file as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Create error result
 */
function errorResult(type: DataType, error: string): ImportResult {
  return {
    success: false,
    type,
    imported: 0,
    skipped: 0,
    total: 0,
    errors: [error],
    samples: []
  }
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Import Customers from CSV
 */
export async function importCustomers(companyId: string, file: File): Promise<ImportResult> {
  try {
    if (!companyId) {
      return errorResult('customers', 'Company ID required')
    }

    const text = await readFileAsText(file)
    const parseResult = parseCustomers(text)

    if (!parseResult.success || parseResult.data.length === 0) {
      return errorResult('customers', parseResult.error || 'No customers found in CSV')
    }

    const records = parseResult.data.map(c => ({
      company_id: companyId,
      customer_number: c.id,
      name: c.name,
      email: c.email || null,
      phone: c.phone || null,
      billing_address: c.address ? { street: c.address, city: c.city || '' } : null,
      tax_id: c.taxId || null,
      is_active: true
    }))

    // Insert in batches for better performance
    const batchSize = 100
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase.from('customers').insert(batch)

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return {
      success: imported > 0,
      type: 'customers',
      imported,
      skipped: records.length - imported,
      total: parseResult.rowCount,
      errors,
      samples: parseResult.data.slice(0, 5).map(c => c.name)
    }
  } catch (error: any) {
    return errorResult('customers', error.message)
  }
}

/**
 * Import Vendors from CSV
 */
export async function importVendors(companyId: string, file: File): Promise<ImportResult> {
  try {
    if (!companyId) {
      return errorResult('vendors', 'Company ID required')
    }

    const text = await readFileAsText(file)
    const parseResult = parseVendors(text)

    if (!parseResult.success || parseResult.data.length === 0) {
      return errorResult('vendors', parseResult.error || 'No vendors found in CSV')
    }

    const records = parseResult.data.map(v => ({
      company_id: companyId,
      vendor_number: v.id,
      name: v.name,
      email: v.email || null,
      phone: v.phone || null,
      address: v.address ? { street: v.address } : null,
      tax_id: v.taxId || null,
      is_active: true
    }))

    const batchSize = 100
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase.from('vendors').insert(batch)

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return {
      success: imported > 0,
      type: 'vendors',
      imported,
      skipped: records.length - imported,
      total: parseResult.rowCount,
      errors,
      samples: parseResult.data.slice(0, 5).map(v => v.name)
    }
  } catch (error: any) {
    return errorResult('vendors', error.message)
  }
}

/**
 * Import Chart of Accounts from CSV
 */
export async function importAccounts(companyId: string, file: File): Promise<ImportResult> {
  try {
    if (!companyId) {
      return errorResult('accounts', 'Company ID required')
    }

    const text = await readFileAsText(file)
    const parseResult = parseAccounts(text)

    if (!parseResult.success || parseResult.data.length === 0) {
      return errorResult('accounts', parseResult.error || 'No accounts found in CSV')
    }

    const records = parseResult.data.map(a => ({
      company_id: companyId,
      account_number: a.accountNumber,
      account_name: a.accountName,
      type: a.type,
      balance: '0',
      is_active: true
    }))

    const batchSize = 100
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase.from('chart_of_accounts').insert(batch)

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return {
      success: imported > 0,
      type: 'accounts',
      imported,
      skipped: records.length - imported,
      total: parseResult.rowCount,
      errors,
      samples: parseResult.data.slice(0, 5).map(a => a.accountName)
    }
  } catch (error: any) {
    return errorResult('accounts', error.message)
  }
}

/**
 * Import Inventory Items from CSV
 */
export async function importItems(companyId: string, file: File): Promise<ImportResult> {
  try {
    if (!companyId) {
      return errorResult('items', 'Company ID required')
    }

    const text = await readFileAsText(file)
    const parseResult = parseItems(text)

    if (!parseResult.success || parseResult.data.length === 0) {
      return errorResult('items', parseResult.error || 'No items found in CSV')
    }

    const records = parseResult.data.map(item => ({
      company_id: companyId,
      sku: item.sku,
      name: item.name,
      description: item.description || item.name,
      cost_price: item.costPrice.toString(),
      selling_price: item.sellingPrice.toString(),
      quantity_on_hand: item.quantity,
      unit_of_measure: item.unit || 'Each',
      type: 'INVENTORY',
      is_active: true
    }))

    const batchSize = 100
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase.from('items').insert(batch)

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return {
      success: imported > 0,
      type: 'items',
      imported,
      skipped: records.length - imported,
      total: parseResult.rowCount,
      errors,
      samples: parseResult.data.slice(0, 5).map(i => i.name)
    }
  } catch (error: any) {
    return errorResult('items', error.message)
  }
}

/**
 * Import Employees from CSV
 */
export async function importEmployees(companyId: string, file: File): Promise<ImportResult> {
  try {
    if (!companyId) {
      return errorResult('employees', 'Company ID required')
    }

    const text = await readFileAsText(file)
    const parseResult = parseEmployees(text)

    if (!parseResult.success || parseResult.data.length === 0) {
      return errorResult('employees', parseResult.error || 'No employees found in CSV')
    }

    const records = parseResult.data.map(emp => ({
      company_id: companyId,
      employee_code: emp.code,
      first_name: emp.firstName,
      last_name: emp.lastName,
      email: emp.email || null,
      phone: emp.phone || null,
      department: emp.department || null,
      job_title: emp.jobTitle || null,
      pay_rate: emp.payRate?.toString() || '0',
      pay_method: emp.payMethod || 'Hourly',
      is_active: true
    }))

    const batchSize = 100
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase.from('employees').insert(batch)

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return {
      success: imported > 0,
      type: 'employees',
      imported,
      skipped: records.length - imported,
      total: parseResult.rowCount,
      errors,
      samples: parseResult.data.slice(0, 5).map(e => `${e.firstName} ${e.lastName}`)
    }
  } catch (error: any) {
    return errorResult('employees', error.message)
  }
}

/**
 * Auto-detect and import CSV
 */
export async function importAuto(companyId: string, file: File): Promise<ImportResult> {
  try {
    if (!companyId) {
      return errorResult('customers', 'Company ID required')
    }

    const text = await readFileAsText(file)
    const detectedType = detectDataType(text)

    if (detectedType === 'unknown') {
      return {
        success: false,
        type: 'customers',
        imported: 0,
        skipped: 0,
        total: 0,
        errors: ['Could not detect CSV type. Please select the data type manually.'],
        samples: []
      }
    }

    // Re-create file for the specific importer
    const newFile = new File([text], file.name, { type: file.type })

    switch (detectedType) {
      case 'customers':
        return importCustomers(companyId, newFile)
      case 'vendors':
        return importVendors(companyId, newFile)
      case 'accounts':
        return importAccounts(companyId, newFile)
      case 'items':
        return importItems(companyId, newFile)
      case 'employees':
        return importEmployees(companyId, newFile)
      default:
        return errorResult('customers', 'Unknown CSV type')
    }
  } catch (error: any) {
    return errorResult('customers', error.message)
  }
}

/**
 * Generic import function
 */
export async function importCSV(
  companyId: string,
  file: File,
  type: DataType | 'auto'
): Promise<ImportResult> {
  switch (type) {
    case 'customers':
      return importCustomers(companyId, file)
    case 'vendors':
      return importVendors(companyId, file)
    case 'accounts':
      return importAccounts(companyId, file)
    case 'items':
      return importItems(companyId, file)
    case 'employees':
      return importEmployees(companyId, file)
    case 'auto':
    default:
      return importAuto(companyId, file)
  }
}
