import { ActionResult } from "@/types/api"
import { supabase } from "@/lib/supabase"
import AdmZip from "adm-zip"

/**
 * Generate Peachtree-compatible backup (.ptb) file
 * PTB files are ZIP archives containing .DAT files
 */
export async function generatePtbBackup(): Promise<ActionResult<string>> {
  try {
    // Fetch all data from database
    const { data: customers } = await supabase.from('customers').select('*')
    const { data: vendors } = await supabase.from('vendors').select('*')
    const { data: accounts } = await supabase.from('chart_of_accounts').select('*')
    const { data: items } = await supabase.from('items').select('*')
    const { data: invoices } = await supabase.from('invoices').select('*')
    const { data: bills } = await supabase.from('bills').select('*')

    // Create ZIP archive
    const zip = new AdmZip()

    // Create CUSTOMER.DAT
    if (customers && customers.length > 0) {
      const customerData = generateCustomerDAT(customers)
      zip.addFile('CUSTOMER.DAT', Buffer.from(customerData, 'latin1'))
    }

    // Create VENDOR.DAT
    if (vendors && vendors.length > 0) {
      const vendorData = generateVendorDAT(vendors)
      zip.addFile('VENDOR.DAT', Buffer.from(vendorData, 'latin1'))
    }

    // Create CHART.DAT (Chart of Accounts)
    if (accounts && accounts.length > 0) {
      const chartData = generateChartDAT(accounts)
      zip.addFile('CHART.DAT', Buffer.from(chartData, 'latin1'))
    }

    // Create ITEMS.DAT (Inventory)
    if (items && items.length > 0) {
      const itemsData = generateItemsDAT(items)
      zip.addFile('ITEMS.DAT', Buffer.from(itemsData, 'latin1'))
    }

    // Create ADDRESS.DAT (Combined addresses)
    const addressData = generateAddressDAT(customers || [], vendors || [])
    zip.addFile('ADDRESS.DAT', Buffer.from(addressData, 'latin1'))

    // Add metadata file
    const metadata = generateMetadata()
    zip.addFile('COMPANY.INI', Buffer.from(metadata, 'utf-8'))

    // Convert to base64 for transfer
    const zipBuffer = zip.toBuffer()
    const base64 = zipBuffer.toString('base64')

    return { success: true, data: base64 }
  } catch (error: any) {
    console.error('PTB backup generation failed:', error)
    return { success: false, error: error.message || 'Failed to generate backup' }
  }
}

/**
 * Generate CUSTOMER.DAT content
 * Format: Fixed-width records with customer data
 */
function generateCustomerDAT(customers: any[]): string {
  let data = ''

  customers.forEach((customer, idx) => {
    // Peachtree fixed-width format (simplified)
    const record = [
      padRight(customer.customer_number || `CUST${idx}`, 20),
      padRight(customer.name || '', 50),
      padRight(customer.contact_name || '', 30),
      padRight(customer.email || '', 50),
      padRight(customer.phone || '', 20),
      padRight(String(customer.balance || '0'), 15),
      padRight(String(customer.credit_limit || '0'), 15),
      padRight(customer.payment_terms || 'NET_30', 10),
      '\r\n'
    ].join('')

    data += record
  })

  return data
}

/**
 * Generate VENDOR.DAT content
 */
function generateVendorDAT(vendors: any[]): string {
  let data = ''

  vendors.forEach((vendor, idx) => {
    const record = [
      padRight(vendor.vendor_number || `VEND${idx}`, 20),
      padRight(vendor.name || '', 50),
      padRight(vendor.contact_name || '', 30),
      padRight(vendor.email || '', 50),
      padRight(vendor.phone || '', 20),
      padRight(String(vendor.balance || '0'), 15),
      padRight(vendor.payment_terms || 'NET_30', 10),
      '\r\n'
    ].join('')

    data += record
  })

  return data
}

/**
 * Generate CHART.DAT content (Chart of Accounts)
 */
function generateChartDAT(accounts: any[]): string {
  let data = ''

  accounts.forEach(account => {
    const record = [
      padRight(account.account_number || '', 10),
      padRight(account.account_name || '', 60),
      padRight(account.type || 'ASSET', 10),
      padRight(String(account.balance || '0'), 15),
      padRight(account.is_active ? 'Y' : 'N', 1),
      '\r\n'
    ].join('')

    data += record
  })

  return data
}

/**
 * Generate ITEMS.DAT content (Inventory Items)
 */
function generateItemsDAT(items: any[]): string {
  let data = ''

  items.forEach(item => {
    const record = [
      padRight(item.sku || '', 20),
      padRight(item.name || '', 60),
      padRight(item.description || '', 100),
      padRight(String(item.cost_price || '0'), 15),
      padRight(String(item.selling_price || '0'), 15),
      padRight(String(item.quantity_on_hand || '0'), 10),
      padRight(item.unit_of_measure || 'EACH', 10),
      '\r\n'
    ].join('')

    data += record
  })

  return data
}

/**
 * Generate ADDRESS.DAT content (Combined customer and vendor addresses)
 */
function generateAddressDAT(customers: any[], vendors: any[]): string {
  let data = ''

  // Add customer addresses
  customers.forEach(customer => {
    const address = customer.billing_address || {}
    const record = [
      padRight('CUSTOMER', 10),
      padRight(customer.customer_number || '', 20),
      padRight(address.street || '', 60),
      padRight(address.city || '', 30),
      padRight(address.region || '', 30),
      padRight(address.postal_code || '', 10),
      padRight(address.country || 'Ethiopia', 30),
      '\r\n'
    ].join('')

    data += record
  })

  // Add vendor addresses
  vendors.forEach(vendor => {
    const address = vendor.address || {}
    const record = [
      padRight('VENDOR', 10),
      padRight(vendor.vendor_number || '', 20),
      padRight(address.street || '', 60),
      padRight(address.city || '', 30),
      padRight(address.state || '', 30),
      padRight(address.zip || '', 10),
      padRight(address.country || 'Ethiopia', 30),
      '\r\n'
    ].join('')

    data += record
  })

  return data
}

/**
 * Generate metadata file
 */
function generateMetadata(): string {
  return `[Company]
Name=SageFlow Export
Version=PAW20.012
ExportDate=${new Date().toISOString()}
Format=Peachtree Compatible
`
}

/**
 * Helper: Pad string to the right
 */
function padRight(str: string, length: number): string {
  return str.padEnd(length, ' ').substring(0, length)
}
