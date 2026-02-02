/**
 * CSV Parser Module
 *
 * Pure parsing functions - no database operations.
 * Handles CSV text parsing with automatic delimiter detection.
 */

import type {
  CSVParseResult,
  ParsedCustomer,
  ParsedVendor,
  ParsedAccount,
  ParsedItem,
  ParsedEmployee,
  AccountType,
  DataType
} from './types'

// ============================================
// CORE CSV PARSING
// ============================================

interface ParsedCSV {
  headers: string[]
  rows: string[][]
  delimiter: string
}

/**
 * Parse raw CSV text into structured data
 */
export function parseCSVText(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: ',' }
  }

  // Auto-detect delimiter
  const firstLine = lines[0]
  const delimiter = detectDelimiter(firstLine)

  // Parse with proper quote handling
  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  // Normalize headers (lowercase, underscores)
  const headers = parseRow(lines[0]).map(h =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
  )

  // Parse data rows
  const rows = lines
    .slice(1)
    .map(parseRow)
    .filter(row => row.some(cell => cell.length > 0))

  return { headers, rows, delimiter }
}

/**
 * Detect delimiter from first line
 */
function detectDelimiter(line: string): string {
  if (line.includes('\t')) return '\t'
  const commas = (line.match(/,/g) || []).length
  const semicolons = (line.match(/;/g) || []).length
  return commas >= semicolons ? ',' : ';'
}

/**
 * Find column index by possible names
 */
function findColumn(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const idx = headers.findIndex(h => h.includes(normalized))
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * Get cell value safely
 */
function getCell(row: string[], index: number): string | undefined {
  return index >= 0 && index < row.length ? row[index] || undefined : undefined
}

/**
 * Parse number from cell
 */
function parseNumber(value: string | undefined): number {
  if (!value) return 0
  return parseFloat(value.replace(/[,$\s]/g, '')) || 0
}

// ============================================
// DATA TYPE PARSERS
// ============================================

/**
 * Parse Customers CSV
 */
export function parseCustomers(text: string): CSVParseResult<ParsedCustomer> {
  try {
    const { headers, rows } = parseCSVText(text)

    if (rows.length === 0) {
      return { success: false, data: [], headers, rowCount: 0, error: 'No data rows found' }
    }

    // Find columns
    const idCol = findColumn(headers, 'id', 'customer_id', 'cust_id', 'number', 'customer_number', 'code')
    const nameCol = findColumn(headers, 'name', 'customer_name', 'company', 'company_name', 'full_name')
    const emailCol = findColumn(headers, 'email', 'e_mail', 'email_address')
    const phoneCol = findColumn(headers, 'phone', 'telephone', 'tel', 'phone_number', 'mobile')
    const addressCol = findColumn(headers, 'address', 'street', 'address_1', 'address1', 'billing_address')
    const cityCol = findColumn(headers, 'city', 'town')
    const taxIdCol = findColumn(headers, 'tax_id', 'tin', 'vat', 'resale_number')
    const balanceCol = findColumn(headers, 'balance', 'amount', 'outstanding')

    // Use sensible defaults
    const effectiveIdCol = idCol !== -1 ? idCol : 0
    const effectiveNameCol = nameCol !== -1 ? nameCol : (idCol === 0 ? 1 : 0)

    const customers: ParsedCustomer[] = rows
      .map((row, idx) => ({
        id: getCell(row, effectiveIdCol) || `CUST-${1000 + idx}`,
        name: getCell(row, effectiveNameCol) || row[0] || `Customer ${idx + 1}`,
        email: getCell(row, emailCol),
        phone: getCell(row, phoneCol),
        address: getCell(row, addressCol),
        city: getCell(row, cityCol),
        taxId: getCell(row, taxIdCol),
        balance: balanceCol !== -1 ? parseNumber(row[balanceCol]) : undefined
      }))
      .filter(c => c.name && c.name.trim().length > 0)

    return { success: true, data: customers, headers, rowCount: rows.length }
  } catch (error: any) {
    return { success: false, data: [], headers: [], rowCount: 0, error: error.message }
  }
}

/**
 * Parse Vendors CSV
 */
export function parseVendors(text: string): CSVParseResult<ParsedVendor> {
  try {
    const { headers, rows } = parseCSVText(text)

    if (rows.length === 0) {
      return { success: false, data: [], headers, rowCount: 0, error: 'No data rows found' }
    }

    const idCol = findColumn(headers, 'id', 'vendor_id', 'vend_id', 'number', 'vendor_number', 'code', 'supplier_id')
    const nameCol = findColumn(headers, 'name', 'vendor_name', 'company', 'supplier', 'supplier_name')
    const emailCol = findColumn(headers, 'email', 'e_mail', 'email_address')
    const phoneCol = findColumn(headers, 'phone', 'telephone', 'tel', 'phone_number')
    const addressCol = findColumn(headers, 'address', 'street', 'address_1')
    const taxIdCol = findColumn(headers, 'tax_id', 'tin', 'vat')
    const balanceCol = findColumn(headers, 'balance', 'amount', 'outstanding', 'payable')

    const effectiveIdCol = idCol !== -1 ? idCol : 0
    const effectiveNameCol = nameCol !== -1 ? nameCol : (idCol === 0 ? 1 : 0)

    const vendors: ParsedVendor[] = rows
      .map((row, idx) => ({
        id: getCell(row, effectiveIdCol) || `VEND-${1000 + idx}`,
        name: getCell(row, effectiveNameCol) || row[0] || `Vendor ${idx + 1}`,
        email: getCell(row, emailCol),
        phone: getCell(row, phoneCol),
        address: getCell(row, addressCol),
        taxId: getCell(row, taxIdCol),
        balance: balanceCol !== -1 ? parseNumber(row[balanceCol]) : undefined
      }))
      .filter(v => v.name && v.name.trim().length > 0)

    return { success: true, data: vendors, headers, rowCount: rows.length }
  } catch (error: any) {
    return { success: false, data: [], headers: [], rowCount: 0, error: error.message }
  }
}

/**
 * Parse Chart of Accounts CSV
 */
export function parseAccounts(text: string): CSVParseResult<ParsedAccount> {
  try {
    const { headers, rows } = parseCSVText(text)

    if (rows.length === 0) {
      return { success: false, data: [], headers, rowCount: 0, error: 'No data rows found' }
    }

    const numberCol = findColumn(headers, 'number', 'account_number', 'acct_no', 'account_no', 'code', 'gl_account', 'account_id')
    const nameCol = findColumn(headers, 'name', 'account_name', 'description', 'title', 'account')
    const typeCol = findColumn(headers, 'type', 'account_type', 'category', 'class')
    const balanceCol = findColumn(headers, 'balance', 'amount', 'debit', 'credit')

    const effectiveNumberCol = numberCol !== -1 ? numberCol : 0
    const effectiveNameCol = nameCol !== -1 ? nameCol : (numberCol === 0 ? 1 : 0)

    const accounts: ParsedAccount[] = rows
      .map((row, idx) => {
        const typeValue = typeCol !== -1 ? row[typeCol]?.toLowerCase() : ''
        const accountName = getCell(row, effectiveNameCol) || row[0] || `Account ${idx + 1}`
        const accountNumber = getCell(row, effectiveNumberCol) || `${1000 + idx}`

        return {
          accountNumber,
          accountName,
          type: inferAccountType(accountName, accountNumber, typeValue),
          balance: balanceCol !== -1 ? parseNumber(row[balanceCol]) : undefined
        }
      })
      .filter(a => a.accountName && a.accountName.trim().length > 0)

    return { success: true, data: accounts, headers, rowCount: rows.length }
  } catch (error: any) {
    return { success: false, data: [], headers: [], rowCount: 0, error: error.message }
  }
}

/**
 * Parse Inventory Items CSV
 */
export function parseItems(text: string): CSVParseResult<ParsedItem> {
  try {
    const { headers, rows } = parseCSVText(text)

    if (rows.length === 0) {
      return { success: false, data: [], headers, rowCount: 0, error: 'No data rows found' }
    }

    const skuCol = findColumn(headers, 'id', 'item_id', 'itemid', 'sku', 'part', 'part_number', 'code', 'item_number')
    const nameCol = findColumn(headers, 'name', 'item_name', 'product', 'title')
    const descCol = findColumn(headers, 'description', 'desc')
    const costCol = findColumn(headers, 'cost', 'unit_cost', 'cost_price', 'purchase_price', 'costing')
    const priceCol = findColumn(headers, 'price', 'unit_price', 'sales_price', 'sell_price', 'selling_price', 'price_level')
    const qtyCol = findColumn(headers, 'quantity', 'qty', 'stock', 'on_hand', 'quantity_on_hand', 'inventory')
    const unitCol = findColumn(headers, 'unit', 'uom', 'unit_of_measure', 'stocking')
    const categoryCol = findColumn(headers, 'category', 'type', 'item_type', 'class', 'item_class')

    const effectiveSkuCol = skuCol !== -1 ? skuCol : 0
    const effectiveNameCol = nameCol !== -1 ? nameCol : (descCol !== -1 ? descCol : (skuCol === 0 ? 1 : 0))

    const items: ParsedItem[] = rows
      .map((row, idx) => ({
        sku: getCell(row, effectiveSkuCol) || `ITEM-${1000 + idx}`,
        name: getCell(row, effectiveNameCol) || row[0] || `Item ${idx + 1}`,
        description: getCell(row, descCol),
        costPrice: parseNumber(getCell(row, costCol)),
        sellingPrice: parseNumber(getCell(row, priceCol)),
        quantity: Math.floor(parseNumber(getCell(row, qtyCol))),
        unit: getCell(row, unitCol),
        category: getCell(row, categoryCol)
      }))
      .filter(i => i.name && i.name.trim().length > 0)

    return { success: true, data: items, headers, rowCount: rows.length }
  } catch (error: any) {
    return { success: false, data: [], headers: [], rowCount: 0, error: error.message }
  }
}

/**
 * Parse Employees CSV
 */
export function parseEmployees(text: string): CSVParseResult<ParsedEmployee> {
  try {
    const { headers, rows } = parseCSVText(text)

    if (rows.length === 0) {
      return { success: false, data: [], headers, rowCount: 0, error: 'No data rows found' }
    }

    const codeCol = findColumn(headers, 'id', 'employee_id', 'emp_id', 'code', 'employee_code', 'emp_code')
    const nameCol = findColumn(headers, 'name', 'employee_name', 'full_name')
    const firstNameCol = findColumn(headers, 'first_name', 'firstname', 'first')
    const lastNameCol = findColumn(headers, 'last_name', 'lastname', 'last', 'surname')
    const emailCol = findColumn(headers, 'email', 'e_mail')
    const phoneCol = findColumn(headers, 'phone', 'telephone', 'tel', 'mobile')
    const deptCol = findColumn(headers, 'department', 'dept')
    const titleCol = findColumn(headers, 'title', 'job_title', 'position', 'role')
    const rateCol = findColumn(headers, 'rate', 'pay_rate', 'hourly_rate', 'salary')
    const methodCol = findColumn(headers, 'pay_method', 'method', 'type')

    const effectiveCodeCol = codeCol !== -1 ? codeCol : 0

    const employees: ParsedEmployee[] = rows
      .map((row, idx) => {
        let firstName = ''
        let lastName = ''

        if (firstNameCol !== -1 && lastNameCol !== -1) {
          firstName = getCell(row, firstNameCol) || ''
          lastName = getCell(row, lastNameCol) || ''
        } else if (nameCol !== -1) {
          const fullName = getCell(row, nameCol) || ''
          const parts = fullName.split(/\s+/)
          firstName = parts[0] || ''
          lastName = parts.slice(1).join(' ') || ''
        }

        return {
          code: getCell(row, effectiveCodeCol) || `EMP-${100 + idx}`,
          firstName: firstName || `Employee`,
          lastName: lastName || `${idx + 1}`,
          email: getCell(row, emailCol),
          phone: getCell(row, phoneCol),
          department: getCell(row, deptCol),
          jobTitle: getCell(row, titleCol),
          payRate: parseNumber(getCell(row, rateCol)),
          payMethod: getCell(row, methodCol)
        }
      })
      .filter(e => e.firstName && e.firstName.trim().length > 0)

    return { success: true, data: employees, headers, rowCount: rows.length }
  } catch (error: any) {
    return { success: false, data: [], headers: [], rowCount: 0, error: error.message }
  }
}

// ============================================
// AUTO-DETECTION
// ============================================

/**
 * Auto-detect CSV data type from content
 */
export function detectDataType(text: string): DataType | 'unknown' {
  const lowerText = text.toLowerCase()
  const firstLines = lowerText.split('\n').slice(0, 3).join(' ')

  if (/customer|client|buyer/i.test(firstLines)) return 'customers'
  if (/vendor|supplier|payable/i.test(firstLines)) return 'vendors'
  if (/account|chart|gl|ledger|debit|credit/i.test(firstLines)) return 'accounts'
  if (/item|inventory|sku|product|part|stock|quantity/i.test(firstLines)) return 'items'
  if (/employee|staff|payroll|salary|wage/i.test(firstLines)) return 'employees'

  return 'unknown'
}

/**
 * Infer account type from name, number, and hint
 */
function inferAccountType(name: string, number: string, hint: string): AccountType {
  const combined = `${name} ${hint}`.toLowerCase()

  if (/cash|bank|receivable|inventory|equipment|asset|property|prepaid|fixed/i.test(combined)) {
    return 'ASSET'
  }
  if (/payable|loan|debt|liability|accrued|deferred|credit/i.test(combined)) {
    return 'LIABILITY'
  }
  if (/equity|capital|retain|owner|stock|share|drawing/i.test(combined)) {
    return 'EQUITY'
  }
  if (/income|revenue|sales|service|interest\s*income|other\s*income/i.test(combined)) {
    return 'REVENUE'
  }
  if (/expense|cost|salary|wage|rent|utility|depreciation|supplies/i.test(combined)) {
    return 'EXPENSE'
  }

  // Fallback: guess from account number (common conventions)
  const firstDigit = number.charAt(0)
  if (firstDigit === '1') return 'ASSET'
  if (firstDigit === '2') return 'LIABILITY'
  if (firstDigit === '3') return 'EQUITY'
  if (firstDigit === '4') return 'REVENUE'
  if (firstDigit === '5' || firstDigit === '6') return 'EXPENSE'

  return 'ASSET'
}
