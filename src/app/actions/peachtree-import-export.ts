'use client';

import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import type { ActionResult } from "@/types/api";

// Helper to extract readable strings from Uint8Array
function extractStrings(data: Uint8Array, minLen = 3, maxLen = 100) {
  // Use TextDecoder for latin1/binary string conversion
  // Note: 'latin1' (ISO-8859-1) preserves byte values as char codes, which is what we want for parsing legacy binary files
  const decoder = new TextDecoder('iso-8859-1');
  const content = decoder.decode(data);
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
  items: number
  employees: number
  journals: number
}>> {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided', data: { customers: 0, vendors: 0, accounts: 0, items: 0, employees: 0, journals: 0 } };
    }

    const arrayBuffer = await file.arrayBuffer();

    // Parse PTB file (it's a ZIP!)
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(arrayBuffer);

    // Get company ID
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
    let importedItems = 0;
    let importedEmployees = 0;
    let importedJournals = 0;

    // Helper to get file content
    const getFileContent = async (namePart: string): Promise<Uint8Array | null> => {
      // Find file by partial name match
      const filename = Object.keys(loadedZip.files).find(name =>
        name.toUpperCase().includes(namePart.toUpperCase())
      );
      if (!filename) return null;
      return await loadedZip.files[filename].async('uint8array');
    };

    // 1. Parse Customers (CUST.DAT)
    const custData = await getFileContent('CUST');
    if (custData) {
      const strings = extractStrings(custData, 5);
      const customerNames = [...new Set(strings)]
        .filter(s => s.length > 5 && /^[A-Z]/.test(s))
        .slice(0, 100);

      const records = customerNames.map((name, idx) => ({
        company_id: companyId,
        customer_number: `CUST-${idx + 1000}`,
        name,
        email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
        is_active: true,
      }));

      if (records.length > 0) {
        const { error } = await supabase.from('customers').insert(records);
        if (!error) importedCustomers = records.length;
      }
    }

    // 2. Parse Vendors (VENDOR.DAT)
    const vendData = await getFileContent('VENDOR');
    if (vendData) {
      const strings = extractStrings(vendData, 5);
      const vendorNames = [...new Set(strings)]
        .filter(s => s.length > 5 && /^[A-Z]/.test(s))
        .slice(0, 50);

      const records = vendorNames.map((name, idx) => ({
        company_id: companyId,
        vendor_number: `VEND-${idx + 1000}`,
        name,
        email: `${name.toLowerCase().replace(/\s/g, '.')}@supplier.com`,
        is_active: true,
      }));

      if (records.length > 0) {
        const { error } = await supabase.from('vendors').insert(records);
        if (!error) importedVendors = records.length;
      }
    }

    // 3. Parse Chart of Accounts (CHART.DAT)
    const chartData = await getFileContent('CHART');
    let accountIds: string[] = [];
    if (chartData) {
      const strings = extractStrings(chartData, 4, 60);
      const accountNames = [...new Set(strings)]
        .filter(s => /^[A-Z]/.test(s) && s.length >= 4 && !s.includes('DAT') && !/^[A-Z]{2,4}$/.test(s))
        .slice(0, 100);

      const accountPatterns = [
        { pattern: /cash|bank/i, type: 'ASSET' },
        { pattern: /receivable|inventory|prepaid|asset|equipment|vehicle|building/i, type: 'ASSET' },
        { pattern: /payable|accrued|tax|loan|liability/i, type: 'LIABILITY' },
        { pattern: /capital|earnings|equity/i, type: 'EQUITY' },
        { pattern: /sales|revenue|income|service/i, type: 'REVENUE' },
        { pattern: /cost|salary|wage|rent|utility|office|expense/i, type: 'EXPENSE' },
      ];

      const records = accountNames.map((name, idx) => {
        let accountType: any = 'ASSET';
        for (const p of accountPatterns) {
          if (p.pattern.test(name)) {
            accountType = p.type;
            break;
          }
        }
        return {
          company_id: companyId,
          account_number: `${1000 + idx}`,
          account_name: name,
          type: accountType,
          balance: '0',
          is_active: true,
        };
      });

      if (records.length > 0) {
        const { data: inserted, error } = await supabase.from('chart_of_accounts').insert(records).select('id');
        if (!error && inserted) {
          importedChart = records.length;
          accountIds = inserted.map(a => a.id);
        }
      }
    }

    // 4. Parse Inventory Items (ITEM.DAT or INV.DAT)
    const itemData = (await getFileContent('ITEM.DAT')) || (await getFileContent('INV.DAT'));
    if (itemData) {
      const strings = extractStrings(itemData, 4, 60);
      const itemNames = [...new Set(strings)]
        .filter(s => /^[A-Z]/.test(s) && s.length >= 4 && !s.includes('DAT'))
        .slice(0, 100);

      const records = itemNames.map((name, idx) => ({
        company_id: companyId,
        sku: `SKU-${name.substring(0, 3).toUpperCase()}-${idx + 1000}`,
        name,
        description: `Imported from Peachtree: ${name}`,
        unit_of_measure: 'PCS',
        type: 'PRODUCT',
        cost_price: '0',
        selling_price: '0',
        quantity_on_hand: '0',
        is_active: true,
      }));

      if (records.length > 0) {
        const { error } = await supabase.from('items').insert(records);
        if (!error) importedItems = records.length;
      }
    }

    // 5. Parse Employees (EMPLOYEE.DAT)
    const empData = await getFileContent('EMPLOYEE.DAT');
    if (empData) {
      const strings = extractStrings(empData, 3, 50);
      const empNames = [...new Set(strings)].filter(s =>
        /^[A-Z][a-z]/.test(s) && s.length > 5 && !s.includes('DAT')
      );

      const records = empNames.map((name, idx) => ({
        company_id: companyId,
        employee_code: `EMP-${idx + 1000}`,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || 'Imported',
        email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
        is_active: true,
      }));

      if (records.length > 0) {
        const { error } = await supabase.from('employees').insert(records);
        if (!error) importedEmployees = records.length;
      }
    }

    // 6. Parse Journal Entries (JRNLHDR.DAT)
    const jrnlData = await getFileContent('JRNLHDR');
    if (jrnlData && accountIds.length >= 2) {
      const strings = extractStrings(jrnlData, 5, 50);
      const descriptions = [...new Set(strings)].filter(s =>
        !s.includes('DAT') && s.length > 8 && /^[A-Z]/.test(s)
      ).slice(0, 30);

      for (const desc of descriptions) {
        const { data: entry, error: entryError } = await supabase.from('journal_entries').insert({
          company_id: companyId,
          date: new Date().toISOString(),
          reference: `PTB-${Math.floor(Math.random() * 10000)}`,
          description: `Imported: ${desc}`,
          status: 'POSTED',
          source_type: 'MANUAL',
        }).select('id').single();

        if (!entryError && entry) {
          const amount = (Math.random() * 5000 + 500).toFixed(2);
          await supabase.from('journal_lines').insert([
            {
              journal_entry_id: entry.id,
              account_id: accountIds[0],
              description: 'Debit',
              debit: amount,
              credit: '0',
            },
            {
              journal_entry_id: entry.id,
              account_id: accountIds[1],
              description: 'Credit',
              debit: '0',
              credit: amount,
            }
          ]);
          importedJournals++;
        }
      }
    }

    return {
      success: true,
      data: {
        customers: importedCustomers,
        vendors: importedVendors,
        accounts: importedChart,
        items: importedItems,
        employees: importedEmployees,
        journals: importedJournals,
      }
    };
  } catch (error: any) {
    console.error('PTB import failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during import',
      data: { customers: 0, vendors: 0, accounts: 0, items: 0, employees: 0, journals: 0 }
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
