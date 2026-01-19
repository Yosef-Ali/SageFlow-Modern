'use server'

import { db } from '@/db'
import { customers, vendors, chartOfAccounts, invoices, payments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import AdmZip from 'adm-zip'

/**
 * Export all company data to Peachtree-compatible PTB format
 * This creates a ZIP archive with CSV files that Peachtree can import
 */
export async function exportToPtb(): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    const companyId = await getCurrentCompanyId()

    // Create ZIP archive
    const zip = new AdmZip()

    // Add header info (Peachtree format)
    const headerInfo = `PAW20.012
NONARCHIVE
NULL
SageFlow Export
{00000000-0000-0000-0000-000000000000}
`
    zip.addFile('_header.txt', Buffer.from(headerInfo))

    // ============ CUSTOMERS CSV ============
    const customerList = await db.query.customers.findMany({
      where: eq(customers.companyId, companyId),
    })

    let customersCsv = 'Customer ID,Customer Name,Contact,Billing Address,City,State,Zip,Phone,Email,Credit Limit,Balance,Active\n'
    for (const c of customerList) {
      const billing = c.billingAddress as any || {}
      customersCsv += [
        `"${c.customerNumber}"`,
        `"${c.name}"`,
        '""',
        `"${billing.street || ''}"`,
        `"${billing.city || ''}"`,
        `"${billing.state || ''}"`,
        `"${billing.zip || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.email || ''}"`,
        c.creditLimit || '0',
        c.balance || '0',
        c.isActive ? 'Yes' : 'No',
      ].join(',') + '\n'
    }
    zip.addFile('CUSTOMERS.CSV', Buffer.from(customersCsv))

    // ============ VENDORS CSV ============
    const vendorList = await db.query.vendors.findMany({
      where: eq(vendors.companyId, companyId),
    })

    let vendorsCsv = 'Vendor ID,Vendor Name,Contact,Address,City,State,Zip,Phone,Email,Tax ID,Balance,Active\n'
    for (const v of vendorList) {
      const address = v.address as any || {}
      vendorsCsv += [
        `"${v.vendorNumber}"`,
        `"${v.name}"`,
        '""',
        `"${address.street || ''}"`,
        `"${address.city || ''}"`,
        `"${address.state || ''}"`,
        `"${address.zip || ''}"`,
        `"${v.phone || ''}"`,
        `"${v.email || ''}"`,
        `"${v.taxId || ''}"`,
        v.balance || '0',
        v.isActive ? 'Yes' : 'No',
      ].join(',') + '\n'
    }
    zip.addFile('VENDORS.CSV', Buffer.from(vendorsCsv))

    // ============ CHART OF ACCOUNTS CSV ============
    const accounts = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.companyId, companyId),
    })

    let accountsCsv = 'Account ID,Account Description,Account Type,Balance,Active\n'
    for (const a of accounts) {
      accountsCsv += [
        `"${a.accountNumber}"`,
        `"${a.accountName}"`,
        `"${a.type}"`,
        a.balance || '0',
        a.isActive ? 'Yes' : 'No',
      ].join(',') + '\n'
    }
    zip.addFile('CHART_OF_ACCOUNTS.CSV', Buffer.from(accountsCsv))

    // ============ INVOICES CSV ============
    const invoiceList = await db.query.invoices.findMany({
      where: eq(invoices.companyId, companyId),
      with: {
        customer: true,
        items: true,
      },
    })

    let invoicesCsv = 'Invoice Number,Customer ID,Customer Name,Date,Due Date,Subtotal,Tax,Total,Status\n'
    for (const inv of invoiceList) {
      invoicesCsv += [
        `"${inv.invoiceNumber}"`,
        `"${inv.customer?.customerNumber || ''}"`,
        `"${inv.customer?.name || ''}"`,
        `"${inv.date?.toISOString().split('T')[0] || ''}"`,
        `"${inv.dueDate?.toISOString().split('T')[0] || ''}"`,
        inv.subtotal || '0',
        inv.taxAmount || '0',
        inv.total || '0',
        `"${inv.status}"`,
      ].join(',') + '\n'
    }
    zip.addFile('INVOICES.CSV', Buffer.from(invoicesCsv))

    // ============ PAYMENTS CSV ============
    const paymentList = await db.query.payments.findMany({
      with: {
        customer: true,
        invoice: true,
      },
    })

    let paymentsCsv = 'Payment ID,Customer ID,Customer Name,Invoice Number,Amount,Date,Method,Reference\n'
    for (const p of paymentList) {
      paymentsCsv += [
        `"PMT-${p.id.slice(0, 8)}"`,
        `"${p.customer?.customerNumber || ''}"`,
        `"${p.customer?.name || ''}"`,
        `"${p.invoice?.invoiceNumber || ''}"`,
        p.amount || '0',
        `"${p.paymentDate?.toISOString().split('T')[0] || ''}"`,
        `"${p.paymentMethod || ''}"`,
        `"${p.reference || ''}"`,
      ].join(',') + '\n'
    }
    zip.addFile('PAYMENTS.CSV', Buffer.from(paymentsCsv))

    // ============ COMPANY INFO ============
    const companyInfo = `Company Name: SageFlow Export
Export Date: ${new Date().toISOString()}
Format: Peachtree Compatible CSV
Customers: ${customerList.length}
Vendors: ${vendorList.length}
Accounts: ${accounts.length}
Invoices: ${invoiceList.length}
Payments: ${paymentList.length}
`
    zip.addFile('README.txt', Buffer.from(companyInfo))

    // Generate buffer - convert to Uint8Array for proper typing
    const zipBuffer = zip.toBuffer()
    const uint8Array = new Uint8Array(zipBuffer)

    return { success: true, data: Buffer.from(uint8Array) }
  } catch (error) {
    console.error('Error exporting to PTB:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export',
    }
  }
}

/**
 * Get export summary
 */
export async function getExportSummary(): Promise<{
  success: boolean
  data?: {
    customers: number
    vendors: number
    accounts: number
    invoices: number
    payments: number
  }
  error?: string
}> {
  try {
    const companyId = await getCurrentCompanyId()

    const [customerCount] = await db.select().from(customers).where(eq(customers.companyId, companyId))
    const [vendorCount] = await db.select().from(vendors).where(eq(vendors.companyId, companyId))
    const [accountCount] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.companyId, companyId))
    const [invoiceCount] = await db.select().from(invoices).where(eq(invoices.companyId, companyId))

    // Get counts properly
    const customersResult = await db.query.customers.findMany({ where: eq(customers.companyId, companyId) })
    const vendorsResult = await db.query.vendors.findMany({ where: eq(vendors.companyId, companyId) })
    const accountsResult = await db.query.chartOfAccounts.findMany({ where: eq(chartOfAccounts.companyId, companyId) })
    const invoicesResult = await db.query.invoices.findMany({ where: eq(invoices.companyId, companyId) })
    const paymentsResult = await db.query.payments.findMany()

    return {
      success: true,
      data: {
        customers: customersResult.length,
        vendors: vendorsResult.length,
        accounts: accountsResult.length,
        invoices: invoicesResult.length,
        payments: paymentsResult.length,
      },
    }
  } catch (error) {
    console.error('Error getting export summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
    }
  }
}
