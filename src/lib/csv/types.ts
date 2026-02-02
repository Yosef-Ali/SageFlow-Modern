/**
 * CSV Types and Interfaces
 */

// ============================================
// PARSE RESULT TYPES
// ============================================

export interface CSVParseResult<T> {
  success: boolean
  data: T[]
  headers: string[]
  rowCount: number
  error?: string
}

// ============================================
// PARSED DATA TYPES (from CSV)
// ============================================

export interface ParsedCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  taxId?: string
  balance?: number
}

export interface ParsedVendor {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  balance?: number
}

export interface ParsedAccount {
  accountNumber: string
  accountName: string
  type: AccountType
  balance?: number
}

export interface ParsedItem {
  sku: string
  name: string
  description?: string
  costPrice: number
  sellingPrice: number
  quantity: number
  unit?: string
  category?: string
}

export interface ParsedEmployee {
  code: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  department?: string
  jobTitle?: string
  payRate?: number
  payMethod?: string
}

// ============================================
// IMPORT/EXPORT TYPES
// ============================================

export type DataType = 'customers' | 'vendors' | 'accounts' | 'items' | 'employees'

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'

export interface ImportResult {
  success: boolean
  type: DataType
  imported: number
  skipped: number
  total: number
  errors: string[]
  samples: string[]
}

export interface ExportResult {
  success: boolean
  type: DataType
  data: string  // CSV content
  filename: string
  count: number
  error?: string
}

// ============================================
// SAGE 50 / PEACHTREE FIELD MAPPINGS
// ============================================

export const SAGE50_CUSTOMER_HEADERS = [
  'Customer ID',
  'Customer Name',
  'Bill to Contact',
  'Bill to Address-Line One',
  'Bill to City',
  'Bill to State',
  'Bill to Zip Code',
  'Bill to Country',
  'Telephone 1',
  'E-mail',
  'Resale Number',
  'Customer Type',
  'Terms',
  'Credit Limit'
] as const

export const SAGE50_VENDOR_HEADERS = [
  'Vendor ID',
  'Vendor Name',
  'Contact',
  'Address-Line One',
  'City',
  'State',
  'Zip Code',
  'Country',
  'Telephone 1',
  'E-mail',
  'Tax ID Number',
  'Vendor Type',
  'Terms',
  '1099 Type'
] as const

export const SAGE50_ACCOUNT_HEADERS = [
  'Account ID',
  'Description',
  'Account Type',
  'Inactive'
] as const

export const SAGE50_ITEM_HEADERS = [
  'Item ID',
  'Description',
  'Item Class',
  'Item Type',
  'Description for Sales',
  'Price Level 1',
  'Cost Method',
  'Costing',
  'Quantity on Hand',
  'Reorder Quantity',
  'Minimum Stock',
  'Item Tax Type',
  'UPC / SKU',
  'Stocking U/M'
] as const

export const SAGE50_EMPLOYEE_HEADERS = [
  'Employee ID',
  'Employee Name',
  'Address Line 1',
  'City',
  'State',
  'Zip Code',
  'Telephone 1',
  'E-mail',
  'Social Security #',
  'Pay Method',
  'Pay Frequency',
  'Hourly Rate'
] as const
