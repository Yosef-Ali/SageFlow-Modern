'use server'

import { db } from '@/db'
import { customers, vendors, chartOfAccounts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'
import AdmZip from 'adm-zip'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Parse customer data from Peachtree .DAT file (extracted from .ptb)
 * Uses string extraction from binary Btrieve format
 */
function extractCustomersFromDat(buffer: Buffer): string[] {
  // Extract readable strings from binary data - Peachtree stores names as plain text
  const content = buffer.toString('latin1')
  const names: string[] = []

  // Find sequences of printable characters that look like names
  const regex = /[\x20-\x7E]{3,50}/g
  const matches = content.match(regex) || []

  // Filter to likely customer names (exclude system strings)
  const systemStrings = ['Customer', 'AirborneQ', 'CUSTOMER', 'DAT', 'Sage', 'Peachtree']
  for (const match of matches) {
    const trimmed = match.trim()
    if (
      trimmed.length >= 3 &&
      !systemStrings.some(s => trimmed.includes(s)) &&
      /^[A-Za-z]/.test(trimmed) &&
      !/^[A-Z]{4,}$/.test(trimmed) // Exclude all-caps codes
    ) {
      if (!names.includes(trimmed)) {
        names.push(trimmed)
      }
    }
  }

  return names
}

/**
 * Import customers from Peachtree .ptb backup file
 */
export async function importFromPtbFile(
  fileBuffer: Buffer
): Promise<ActionResult<{ customers: number; vendors: number }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Parse the ZIP archive
    const zip = new AdmZip(fileBuffer)
    const entries = zip.getEntries()

    let customerCount = 0
    let vendorCount = 0

    // Look for CUSTOMER.DAT
    const customerEntry = entries.find(e => e.entryName.toUpperCase() === 'CUSTOMER.DAT')
    if (customerEntry) {
      const customerData = customerEntry.getData()
      const customerNames = extractCustomersFromDat(customerData)

      // Import each customer
      for (const name of customerNames) {
        // Check if customer already exists
        const existing = await db.query.customers.findFirst({
          where: and(
            eq(customers.companyId, companyId),
            eq(customers.name, name)
          ),
        })

        if (!existing) {
          // Generate customer number
          const count = await db.select().from(customers).where(eq(customers.companyId, companyId))
          const customerNumber = `CUST-${String(count.length + 1).padStart(4, '0')}`

          await db.insert(customers).values({
            companyId,
            customerNumber,
            name,
            isActive: true,
          })
          customerCount++
        }
      }
    }

    // Look for VENDOR.DAT
    const vendorEntry = entries.find(e => e.entryName.toUpperCase() === 'VENDOR.DAT')
    if (vendorEntry) {
      const vendorData = vendorEntry.getData()
      const vendorNames = extractCustomersFromDat(vendorData) // Same extraction logic

      for (const name of vendorNames) {
        const existing = await db.query.vendors.findFirst({
          where: and(
            eq(vendors.companyId, companyId),
            eq(vendors.name, name)
          ),
        })

        if (!existing) {
          const count = await db.select().from(vendors).where(eq(vendors.companyId, companyId))
          const vendorNumber = `VEND-${String(count.length + 1).padStart(4, '0')}`

          await db.insert(vendors).values({
            companyId,
            vendorNumber,
            name,
            isActive: true,
          })
          vendorCount++
        }
      }
    }

    revalidatePath('/dashboard/customers')
    revalidatePath('/dashboard/settings/import-export')

    return {
      success: true,
      data: { customers: customerCount, vendors: vendorCount },
    }
  } catch (error) {
    console.error('Error importing from PTB:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import PTB file',
    }
  }
}

/**
 * Export customers to Peachtree-compatible CSV format
 */
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

/**
 * Export vendors to Peachtree-compatible CSV format
 */
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

/**
 * Export chart of accounts to Peachtree-compatible CSV format
 */
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

/**
 * Import customers from CSV file
 */
export async function importCustomersFromCSV(
  csvContent: string
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Parse CSV
    const lines = csvContent.split('\n').filter(l => l.trim())
    if (lines.length < 2) {
      return { success: false, error: 'CSV file is empty or missing data rows' }
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
    const nameIndex = headers.findIndex(h => h.includes('name') && h.includes('customer'))
    const idIndex = headers.findIndex(h => h.includes('id') && h.includes('customer'))

    if (nameIndex === -1) {
      return { success: false, error: 'Could not find Customer Name column' }
    }

    let imported = 0
    let skipped = 0

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
      const name = values[nameIndex]
      const customerId = idIndex >= 0 ? values[idIndex] : undefined

      if (!name) {
        skipped++
        continue
      }

      // Check if exists
      const existing = await db.query.customers.findFirst({
        where: and(
          eq(customers.companyId, companyId),
          eq(customers.name, name)
        ),
      })

      if (existing) {
        skipped++
        continue
      }

      // Generate customer number if not provided
      const count = await db.select().from(customers).where(eq(customers.companyId, companyId))
      const customerNumber = customerId || `CUST-${String(count.length + 1).padStart(4, '0')}`

      await db.insert(customers).values({
        companyId,
        customerNumber,
        name,
        isActive: true,
      })
      imported++
    }

    revalidatePath('/dashboard/customers')

    return { success: true, data: { imported, skipped } }
  } catch (error) {
    console.error('Error importing customers from CSV:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import CSV',
    }
  }
}

/**
 * Get list of files in PTB archive for preview
 */
export async function previewPtbFile(
  fileBuffer: Buffer
): Promise<ActionResult<{ files: string[]; customers: string[]; vendors: string[] }>> {
  try {
    const zip = new AdmZip(fileBuffer)
    const entries = zip.getEntries()

    const files = entries.map(e => e.entryName).filter(n => n.endsWith('.DAT') || n.endsWith('.dat'))

    let customerNames: string[] = []
    let vendorNames: string[] = []

    const customerEntry = entries.find(e => e.entryName.toUpperCase() === 'CUSTOMER.DAT')
    if (customerEntry) {
      customerNames = extractCustomersFromDat(customerEntry.getData()).slice(0, 20)
    }

    const vendorEntry = entries.find(e => e.entryName.toUpperCase() === 'VENDOR.DAT')
    if (vendorEntry) {
      vendorNames = extractCustomersFromDat(vendorEntry.getData()).slice(0, 20)
    }

    return {
      success: true,
      data: { files, customers: customerNames, vendors: vendorNames },
    }
  } catch (error) {
    console.error('Error previewing PTB:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview PTB file',
    }
  }
}
