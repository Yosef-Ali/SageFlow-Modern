'use server'

import { db } from '@/db'
import {
  chartOfAccounts,
  customers,
  vendors,
  employees,
  journalEntries,
  journalLines
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import AdmZip from 'adm-zip'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

const PEACHTREE_MAP = {
  chart: 'CHART.CSV',
  customer: 'CUST.CSV',
  vendor: 'VENDOR.CSV',
  employee: 'EMPLOYEE.CSV',
  journal: 'JRNL.CSV'
}

/**
 * Generate Full Backup PTB (ZIP of CSVs)
 */
export async function generatePtbBackup(): Promise<ActionResult<string>> {
  try {
    const companyId = await getCurrentCompanyId()
    const zip = new AdmZip()

    // 1. Chart of Accounts
    const accounts = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.companyId, companyId)
    })
    const chartCsv = [
      'Account ID,Description,Type,Active',
      ...accounts.map(a =>
        `"${a.accountNumber}","${a.accountName}","${a.type}",${a.isActive ? 'TRUE' : 'FALSE'}`
      )
    ].join('\n')
    zip.addFile(PEACHTREE_MAP.chart, Buffer.from(chartCsv))

    // 2. Customers
    const custList = await db.query.customers.findMany({
      where: eq(customers.companyId, companyId)
    })
    const custCsv = [
      'Customer ID,Name,Contact,Active',
      ...custList.map(c =>
        `"${c.customerNumber || ''}","${c.customerName}","${c.email || ''}",${c.isActive ? 'TRUE' : 'FALSE'}`
      )
    ].join('\n')
    zip.addFile(PEACHTREE_MAP.customer, Buffer.from(custCsv))

    // 3. Vendors
    const vendList = await db.query.vendors.findMany({
      where: eq(vendors.companyId, companyId)
    })
    const vendCsv = [
      'Vendor ID,Name,Contact,Active',
      ...vendList.map(v =>
        `"${v.vendorNumber || ''}","${v.name}","${v.email || ''}",${v.isActive ? 'TRUE' : 'FALSE'}`
      )
    ].join('\n')
    zip.addFile(PEACHTREE_MAP.vendor, Buffer.from(vendCsv))

    // 4. Employees
    const empList = await db.select().from(employees).where(eq(employees.companyId, companyId))
    const empCsv = [
      'Employee ID,First Name,Last Name,Active',
      ...empList.map(e =>
        `"${e.employeeCode}","${e.firstName}","${e.lastName}",${e.isActive ? 'TRUE' : 'FALSE'}`
      )
    ].join('\n')
    zip.addFile(PEACHTREE_MAP.employee, Buffer.from(empCsv))

    // 5. Journal Entries (Transaction History)
    const journals = await db.query.journalEntries.findMany({
      where: eq(journalEntries.companyId, companyId),
      with: { lines: { with: { account: true } } }
    })
    // Flatten journal lines for CSV
    const journalRows = []
    journalRows.push('Date,Reference,Description,Account ID,Amount,Debit/Credit')

    for (const entry of journals) {
      for (const line of entry.lines) {
        // Simple representation: + for Debit, - for Credit to match some formats,
        // or just listed columns. Let's do standard CSV structure.
        const amt = parseFloat(line.debit) > 0 ? line.debit : `-${line.credit}`
        const dc = parseFloat(line.debit) > 0 ? 'Debit' : 'Credit'
        journalRows.push(
          `"${entry.date.toISOString().split('T')[0]}","${entry.reference || ''}","${entry.description}","${line.account.accountNumber}","${amt}","${dc}"`
        )
      }
    }
    zip.addFile(PEACHTREE_MAP.journal, Buffer.from(journalRows.join('\n')))

    // Return base64 of zip
    return { success: true, data: zip.toBuffer().toString('base64') }

  } catch (error) {
    console.error('Backup Error:', error)
    return { success: false, error: 'Failed to generate backup' }
  }
}
