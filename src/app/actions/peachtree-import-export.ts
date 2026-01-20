'use server'

import { db } from '@/db'
import {
  customers,
  vendors,
  chartOfAccounts,
  items,
  users,
  journalEntries,
  journalLines,
  employees,
  auditLogs,
  accountTypeEnum
} from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'
import AdmZip from 'adm-zip'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

type ImportCounts = {
  customers: number
  vendors: number
  accounts: number
  items: number
  employees: number
  journals: number
  auditLogs: number
}

/**
 * Helper to extract readable strings from binary data
 */
function extractStrings(buffer: Buffer, minLen = 3, maxLen = 100): string[] {
  const content = buffer.toString('latin1')
  // enhanced regex to captures strings of printable characters
  const regex = /[\x20-\x7E]{3,}/g
  const matches = content.match(regex) || []

  return matches
    .map(m => m.trim())
    .filter(m =>
      m.length >= minLen &&
      m.length <= maxLen &&
      !m.includes('Btrieve') &&
      !m.includes('Peachtree')
    )
}

/**
 * Parse Account Data from Strings
 * Heuristic approach to identify account number/name pairs
 */
function parseAccountData(strings: string[]) {
  const accounts: { number: string; name: string; type: typeof accountTypeEnum.enumValues[number] }[] = []

  // Peachtree accounts often look like: "1000 Cash on Hand", or split "1000", "Cash"
  // We'll look for strings that start with 4+ digits

  for (const s of strings) {
    // Check for Account Number pattern (at least 4 digits)
    const match = s.match(/^(\d{4,})-?(\d*)\s+(.*)/)
    if (match) {
      const number = match[1] + (match[2] ? '-' + match[2] : '')
      const name = match[3]

      let type: typeof accountTypeEnum.enumValues[number] = 'EXPENSE'
      const startDigit = number[0]
      if (startDigit === '1') type = 'ASSET'
      else if (startDigit === '2') type = 'LIABILITY'
      else if (startDigit === '3') type = 'EQUITY'
      else if (startDigit === '4') type = 'REVENUE'

      accounts.push({ number, name, type })
    }
  }
  return accounts
}

/**
 * Main Import Action
 */
export async function importPtbAction(formData: FormData): Promise<ActionResult<ImportCounts>> {
  try {
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file uploaded' }

    const buffer = Buffer.from(await file.arrayBuffer())
    const companyId = await getCurrentCompanyId()

    // Parse ZIP
    let zip: AdmZip
    try {
      zip = new AdmZip(buffer)
    } catch (e) {
      return { success: false, error: 'Invalid PTB/ZIP file format' }
    }

    const entries = zip.getEntries()
    const counts: ImportCounts = {
      customers: 0,
      vendors: 0,
      accounts: 0,
      items: 0,
      employees: 0,
      journals: 0,
      auditLogs: 0
    }

    // --- 1. CHART OF ACCOUNTS (CHART.DAT) ---
    const chartEntry = entries.find(e => e.entryName.toUpperCase().includes('CHART.DAT'))
    if (chartEntry) {
      const strings = extractStrings(chartEntry.getData())
      const parsedAccounts = parseAccountData(strings)

      for (const acc of parsedAccounts) {
        // Check existence
        const existing = await db.query.chartOfAccounts.findFirst({
          where: and(
            eq(chartOfAccounts.companyId, companyId),
            eq(chartOfAccounts.accountNumber, acc.number)
          )
        })

        if (!existing) {
          await db.insert(chartOfAccounts).values({
            companyId,
            accountNumber: acc.number,
            accountName: acc.name,
            type: acc.type,
            isActive: true
          })
          counts.accounts++
        }
      }
    }

    // --- 2. CUSTOMERS (CUSTOMER.DAT) ---
    const customerEntry = entries.find(e => e.entryName.toUpperCase().includes('CUSTOMER.DAT'))
    if (customerEntry) {
      // Basic extraction of names
      const strings = extractStrings(customerEntry.getData())
      const names = strings.filter(s =>
        /^[A-Z][a-z]+/.test(s) &&
        !s.includes('DAT') &&
        s.length > 3
      )

      const uniqueNames = [...new Set(names)]

      for (const name of uniqueNames.slice(0, 50)) { // Limit to avoid garbage
        const existing = await db.query.customers.findFirst({
          where: and(eq(customers.companyId, companyId), eq(customers.name, name))
        })

        if (!existing) {
          const [res] = await db.select({ count: count() }).from(customers).where(eq(customers.companyId, companyId))
          const num = `CUST-${String(res.count + 1).padStart(4, '0')}`

          await db.insert(customers).values({
            companyId,
            customerNumber: num,
            name,
            isActive: true
          })
          counts.customers++
        }
      }
    }

    // --- 3. VENDORS (VENDOR.DAT) ---
    const vendorEntry = entries.find(e => e.entryName.toUpperCase().includes('VENDOR.DAT'))
    if (vendorEntry) {
      // Similar logic to customers
      const strings = extractStrings(vendorEntry.getData())
      const names = strings.filter(s =>
        /^[A-Z][a-z]+/.test(s) &&
        !s.includes('DAT') &&
        !s.includes('Vendor') &&
        s.length > 3
      )

      const uniqueNames = [...new Set(names)]

      for (const name of uniqueNames.slice(0, 50)) {
        const existing = await db.query.vendors.findFirst({
          where: and(eq(vendors.companyId, companyId), eq(vendors.name, name))
        })

        if (!existing) {
          const [res] = await db.select({ count: count() }).from(vendors).where(eq(vendors.companyId, companyId))
          const num = `VEND-${String(res.count + 1).padStart(4, '0')}`

          await db.insert(vendors).values({
            companyId,
            vendorNumber: num,
            name,
            isActive: true
          })
          counts.vendors++
        }
      }
    }

    // --- 4. INVENTORY ITEMS (ITEM.DAT or INVENTORY.DAT) ---
    const itemEntry = entries.find(e =>
      e.entryName.toUpperCase().includes('ITEM.DAT') ||
      e.entryName.toUpperCase().includes('INVENTORY.DAT')
    )
    if (itemEntry) {
      const strings = extractStrings(itemEntry.getData())
      // Items usually have an ID (uppercase) and Name
      const probableItems = strings.filter(s =>
        /^[A-Z0-9-]{3,}$/.test(s) || // potential SKU
        (/^[A-Z][a-z]/.test(s) && s.length > 4) // potential Name
      )

      // Simple toggle heuristic: SKU then Name
      for (let i = 0; i < probableItems.length - 1; i++) {
        const s1 = probableItems[i]
        const s2 = probableItems[i + 1]

        if (/^[A-Z0-9-]{3,}$/.test(s1) && /^[A-Z][a-z]/.test(s2)) {
          // Looks like SKU -> Name pair
          const existing = await db.query.items.findFirst({
            where: and(eq(items.companyId, companyId), eq(items.sku, s1))
          })

          if (!existing) {
            await db.insert(items).values({
              companyId,
              sku: s1,
              name: s2,
              unitOfMeasure: 'PCS',
              costPrice: '0',
              sellingPrice: '0',
              isActive: true
            })
            counts.items++
            i++ // Skip next
          }
        }
      }
    }

    // --- 5. EMPLOYEES (EMPLOYEE.DAT) ---
    const empEntry = entries.find(e => e.entryName.toUpperCase().includes('EMPLOYEE.DAT'))
    if (empEntry) {
      const strings = extractStrings(empEntry.getData())
      const names = strings.filter(s =>
        /^[A-Z][a-z]+/.test(s) && s.includes(' ') && s.length > 5 && !s.includes('DAT')
      )

      const uniqueNames = [...new Set(names)]

      for (const name of uniqueNames.slice(0, 20)) {
        // Create user record for login
        const email = `${name.toLowerCase().replace(/[^a-z]/g, '.')}@example.com`

        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, email)
        })

        if (!existingUser) {
          const userId = crypto.randomUUID()
          await db.insert(users).values({
            id: userId,
            companyId,
            email,
            name,
            passwordHash: '$2b$10$placeholderexamplehash', // Placeholder
            role: 'EMPLOYEE',
          })

          await db.insert(employees).values({
            companyId,
            userId,
            employeeCode: `EMP-${name.substring(0, 3).toUpperCase()}`,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || 'Employee',
          })
          counts.employees++
        }
      }
    }

    // --- 6. JOURNAL ENTRIES (JRNLHDR.DAT / JRNLROW.DAT) ---
    // This is complex for binary parsing. We'll implement a basic header importer for now.
    const jrnlEntry = entries.find(e => e.entryName.toUpperCase().includes('JRNLHDR.DAT'))
    if (jrnlEntry) {
      const strings = extractStrings(jrnlEntry.getData())
      // References often look like "REF123" or dates
      const refs = strings.filter(s => s.length > 4 && /[0-9]/.test(s))
      const uniqueRefs = [...new Set(refs)].slice(0, 50)

      for (const ref of uniqueRefs) {
        // Create a dummy journal for each ref found
        const existing = await db.query.journalEntries.findFirst({
          where: and(eq(journalEntries.companyId, companyId), eq(journalEntries.reference, ref))
        })

        if (!existing) {
          await db.insert(journalEntries).values({
            companyId,
            date: new Date(),
            description: `Imported Journal: ${ref}`,
            reference: ref,
            status: 'POSTED',
            sourceType: 'MANUAL'
          })
          counts.journals++
        }
      }
    }

    revalidatePath('/dashboard/customers')
    revalidatePath('/dashboard/invoices')
    revalidatePath('/dashboard/settings/import-export')
    revalidatePath('/dashboard/journals')
    revalidatePath('/dashboard/audit-trail')

    return { success: true, data: counts }

  } catch (error) {
    console.error('Import Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed'
    }
  }
}

// Keep export functions
export async function exportCustomersToCSV(): Promise<ActionResult<string>> {
  try {
    const companyId = await getCurrentCompanyId()

    const customerList = await db.query.customers.findMany({
      where: eq(customers.companyId, companyId),
      orderBy: (customers, { asc }) => [asc(customers.name)],
    })

    // Build CSV with Peachtree headers
    const headers = [
      'Customer ID',
      'Customer Name',
      'Contact',
      'Billing Address',
      'City',
      'State',
      'Zip',
      'Phone',
      'Email',
      'Credit Limit',
      'Balance',
      'Active',
    ]

    const rows = customerList.map(c => {
      const billing = c.billingAddress as any || {}
      return [
        c.customerNumber,
        c.name,
        '', // Contact
        billing.street || '',
        billing.city || '',
        billing.state || '',
        billing.zip || '',
        c.phone || '',
        c.email || '',
        c.creditLimit || '0',
        c.balance || '0',
        c.isActive ? 'Yes' : 'No',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    return { success: true, data: csv }
  } catch (error) {
    console.error('Error exporting customers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export customers',
    }
  }
}

export async function exportVendorsToCSV(): Promise<ActionResult<string>> {
  try {
    const companyId = await getCurrentCompanyId()

    const vendorList = await db.query.vendors.findMany({
      where: eq(vendors.companyId, companyId),
      orderBy: (vendors, { asc }) => [asc(vendors.name)],
    })

    const headers = [
      'Vendor ID',
      'Vendor Name',
      'Contact',
      'Address',
      'City',
      'State',
      'Zip',
      'Phone',
      'Email',
      'Tax ID',
      'Balance',
      'Active',
    ]

    const rows = vendorList.map(v => {
      const address = v.address as any || {}
      return [
        v.vendorNumber,
        v.name,
        '', // Contact
        address.street || '',
        address.city || '',
        address.state || '',
        address.zip || '',
        v.phone || '',
        v.email || '',
        v.taxId || '',
        v.balance || '0',
        v.isActive ? 'Yes' : 'No',
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    return { success: true, data: csv }
  } catch (error) {
    console.error('Error exporting vendors:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export vendors',
    }
  }
}

export async function exportChartOfAccountsToCSV(): Promise<ActionResult<string>> {
  try {
    const companyId = await getCurrentCompanyId()

    const accounts = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.companyId, companyId),
      orderBy: (coa, { asc }) => [asc(coa.accountNumber)],
    })

    const headers = [
      'Account ID',
      'Account Description',
      'Account Type',
      'Balance',
      'Active',
    ]

    const rows = accounts.map(a => [
      a.accountNumber,
      a.accountName,
      a.type,
      a.balance || '0',
      a.isActive ? 'Yes' : 'No',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')

    return { success: true, data: csv }
  } catch (error) {
    console.error('Error exporting chart of accounts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export chart of accounts',
    }
  }
}
