'use client';

import AdmZip from 'adm-zip';
import { supabase } from '@/lib/supabase';
import type { ActionResult } from "@/types/api";

// Helper to extract readable strings from binary buffer
function extractStrings(buffer: Buffer, minLen = 3, maxLen = 100) {
  const content = buffer.toString('latin1');
  const regex = new RegExp(`[\\x20-\\x7E]{${minLen},${maxLen}}`, 'g');
  const matches = content.match(regex) || [];
  return matches.map(m => m.trim()).filter(m => m.length >= minLen);
}

/**
 * Import Peachtree (.ptb) backup file
 * PTB files are actually ZIP archives containing .DAT files
 */
export async function importPtbAction(formData: FormData): Promise<ActionResult<{
  customers: number
  vendors: number
  accounts: number
}>> {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided', data: { customers: 0, vendors: 0, accounts: 0 } };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PTB file (it's a ZIP!)
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Get company ID - usually we target the first one or a specific one
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companyError || !companies || companies.length === 0) {
      throw new Error('No company found in database. Please create a company first.');
    }
    const companyId = companies[0].id;

    let importedCustomers = 0;
    let importedVendors = 0;
    let importedChart = 0;

    // 1. Parse Customers (CUST.DAT or similar)
    const customersEntry = entries.find(e =>
      e.entryName.toUpperCase().includes('CUST')
    );

    if (customersEntry) {
      const data = customersEntry.getData();
      const strings = extractStrings(data, 5);

      // Filter for likely customer names (heuristic: start with uppercase, reasonable length)
      const customerNames = [...new Set(strings)]
        .filter(s => s.length > 5 && /^[A-Z]/.test(s))
        .slice(0, 100);

      const customerRecords = customerNames.map((name, idx) => ({
        company_id: companyId,
        customer_number: `CUST-${idx + 1000}`,
        name: name,
        email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
        phone: '',
        is_active: true,
      }));

      if (customerRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('customers')
          .insert(customerRecords);

        if (!insertError) importedCustomers = customerRecords.length;
      }
    }

    // 2. Parse Vendors (VENDOR.DAT or similar)
    const vendorsEntry = entries.find(e =>
      e.entryName.toUpperCase().includes('VENDOR')
    );

    if (vendorsEntry) {
      const data = vendorsEntry.getData();
      const strings = extractStrings(data, 5);

      const vendorNames = [...new Set(strings)]
        .filter(s => s.length > 5 && /^[A-Z]/.test(s))
        .slice(0, 50);

      const vendorRecords = vendorNames.map((name, idx) => ({
        company_id: companyId,
        vendor_number: `VEND-${idx + 1000}`,
        name: name,
        email: `${name.toLowerCase().replace(/\s/g, '.')}@supplier.com`,
        phone: '',
        is_active: true,
      }));

      if (vendorRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('vendors')
          .insert(vendorRecords);

        if (!insertError) importedVendors = vendorRecords.length;
      }
    }

    // 3. Parse Chart of Accounts (CHART.DAT)
    const chartEntry = entries.find(e =>
      e.entryName.toUpperCase().includes('CHART')
    );

    if (chartEntry) {
      const data = chartEntry.getData();
      const strings = extractStrings(data, 4, 60);

      const accountNames = [...new Set(strings)]
        .filter(s => /^[A-Z]/.test(s) && s.length >= 4)
        .slice(0, 50);

      const accountRecords = accountNames.map((name, idx) => ({
        company_id: companyId,
        account_number: `${1000 + idx}`,
        account_name: name,
        type: 'ASSET', // Default as we can't easily guess type from binary pattern yet
        balance: '0',
        is_active: true,
      }));

      if (accountRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('chart_of_accounts')
          .insert(accountRecords);

        if (!insertError) importedChart = accountRecords.length;
      }
    }

    return {
      success: true,
      data: {
        customers: importedCustomers,
        vendors: importedVendors,
        accounts: importedChart,
      }
    };
  } catch (error: any) {
    console.error('PTB import failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during import',
      data: { customers: 0, vendors: 0, accounts: 0 }
    };
  }
}

/**
 * Export Customers to CSV
 */
export async function exportCustomersToCSV(): Promise<ActionResult<string>> {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*');

    if (error) throw error;
    if (!customers || customers.length === 0) {
      return { success: false, error: 'No customers found to export' };
    }

    const headers = ['Customer ID', 'Customer Number', 'Name', 'Email', 'Phone', 'Balance'];
    const rows = customers.map(c => [
      c.id,
      c.customer_number,
      c.name,
      c.email || '',
      c.phone || '',
      c.balance || '0'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Vendors to CSV
 */
export async function exportVendorsToCSV(): Promise<ActionResult<string>> {
  try {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*');

    if (error) throw error;
    if (!vendors || vendors.length === 0) {
      return { success: false, error: 'No vendors found to export' };
    }

    const headers = ['Vendor ID', 'Vendor Number', 'Name', 'Email', 'Phone', 'Balance'];
    const rows = vendors.map(v => [
      v.id,
      v.vendor_number,
      v.name,
      v.email || '',
      v.phone || '',
      v.balance || '0'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Chart of Accounts to CSV
 */
export async function exportChartOfAccountsToCSV(): Promise<ActionResult<string>> {
  try {
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('*');

    if (error) throw error;
    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No accounts found to export' };
    }

    const headers = ['Account ID', 'Account Number', 'Account Name', 'Type', 'Balance'];
    const rows = accounts.map(a => [
      a.id,
      a.account_number,
      a.account_name,
      a.type,
      a.balance || '0'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
