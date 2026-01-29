'use client';

import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import type { ActionResult } from "@/types/api";

// Helper to extract readable strings from binary data
function extractStrings(data: Uint8Array, minLen = 3, maxLen = 80) { // Default minLen reduced to 3
  const decoder = new TextDecoder('latin1');
  const content = decoder.decode(data);
  // Match any sequence of printable ASCII characters
  const regex = /[\x20-\x7E]{3,100}/g;
  const matches = content.match(regex) || [];

  return matches
    .map(m => {
      let cleaned = m.trim();
      // Remove ANY leading characters that aren't Uppercase or numbers 
      // (Peachtree records often have status bytes like lowercase 'e' or control chars at the start)
      while (cleaned.length > minLen && !/^[A-Z0-9]/.test(cleaned)) {
        cleaned = cleaned.substring(1);
      }
      return cleaned;
    })
    .filter(m => {
      const isTooShort = m.length < minLen;
      const isNumeric = /^[0-9\s\.-]+$/.test(m);
      // Relaxed technical filter: Only block strings that look like typical file names or known junk
      const isTechnical = m.toUpperCase().includes('.DAT') || m.includes('.rpt') || /^[A-Z0-9]{4}$/.test(m) && !/^[A-Z][a-z]{3}$/.test(m);
      const isLowercaseJunk = /^[a-z]{1,3}$/.test(m);
      return !isTooShort && !isNumeric && !isTechnical && !isLowercaseJunk;
    });
}

/**
 * Import Peachtree (.ptb) backup file
 * PTB files are actually ZIP archives containing .DAT files
 */
export async function importPtbAction(formData: FormData): Promise<ActionResult<{
  customers: number
  vendors: number
  accounts: number
  employees: number
  items: number
  samples?: {
    customers: string[]
    vendors: string[]
    accounts: string[]
  }
}>> {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return {
        success: false,
        error: 'No file provided',
        data: { customers: 0, vendors: 0, accounts: 0, employees: 0, items: 0, samples: { customers: [], vendors: [], accounts: [] } }
      };
    }

    const arrayBuffer = await file.arrayBuffer();

    // Parse PTB file (it's a ZIP!)
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);

    // Debug: Log file names to see archive structure
    const allFiles = Object.keys(contents.files);
    console.log(`[SageFlow PTB Import v3.0] Processing ${allFiles.length} files...`);

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
    let importedEmployees = 0;
    let importedItems = 0;

    const samples = {
      customers: [] as string[],
      vendors: [] as string[],
      accounts: [] as string[]
    };

    // Helper to find file in ZIP (case-insensitive) - Expanded variations
    const findFile = (patterns: string[]) => {
      return allFiles.find(name =>
        patterns.some(p => name.toUpperCase().includes(p.toUpperCase()))
      );
    };

    // 1. Parse Customers
    const customersFile = findFile(['CUSTOMER.DAT', 'CUST.DAT', 'CUSTOMERS.DAT']);
    if (customersFile) {
      console.log('Parsing customers from:', customersFile);
      const data = await contents.files[customersFile].async('uint8array');
      const strings = extractStrings(data, 4);

      // Filter for likely customer names (heuristic: start with uppercase, reasonable length)
      const customerNames = [...new Set(strings)]
        .filter(s => s.length >= 4 && s.length <= 60)
        .filter(s => /^[A-Z]/.test(s)) // Must start with Uppercase for high-quality names
        .filter(s => !['Customer', 'Others', 'Customer ID'].includes(s))
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

        if (!insertError) {
          importedCustomers = customerRecords.length;
          samples.customers = customerNames.slice(0, 10);
        } else {
          console.error('Customer insert error:', insertError);
        }
      }
    }

    // 2. Parse Vendors
    const vendorsFile = findFile(['VENDOR.DAT', 'VENDORS.DAT']);
    if (vendorsFile) {
      console.log('Parsing vendors from:', vendorsFile);
      const data = await contents.files[vendorsFile].async('uint8array');

      // Pass 1: High Quality Scan
      let strings = extractStrings(data, 4);
      let vendorNames = [...new Set(strings)]
        .filter(s => s.length >= 4 && s.length <= 60)
        .filter(s => /^[A-Z]/.test(s))
        .filter(s => !['Vendor', 'Supplies', 'Inventory', 'Payment', 'Employee'].includes(s));

      // Pass 2: Fallback Permissive Scan (if Pass 1 failed to find enough records)
      if (vendorNames.length < 3) {
        console.log('Pass 1 yielded low vendor count. Attempting Permissive Scan...');
        // Relax filtering: allow shorter strings, ignore strict uppercase start if clean enough
        const rawStrings = extractStrings(data, 3); // Lower minLen
        const additionalNames = [...new Set(rawStrings)]
          .filter(s => s.length >= 3 && s.length <= 60)
          .filter(s => !/^[0-9]+$/.test(s)) // Just block purely numeric
          .filter(s => !['Vendor', 'Supplies', 'Inventory', 'Payment', 'Employee', 'Cost', 'Building Costs', 'Vehicle'].includes(s))
          .filter(s => !vendorNames.includes(s));

        vendorNames = [...vendorNames, ...additionalNames];
      }

      vendorNames = vendorNames.slice(0, 50);

      const timestamp = Date.now();
      const vendorRecords = vendorNames.map((name, idx) => ({
        company_id: companyId,
        // Use timestamp to minimize collision risk
        vendor_number: `VEND-${timestamp.toString().slice(-6)}-${idx}`,
        name: name,
        email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@supplier.com`,
        phone: '',
        is_active: true,
      }));

      if (vendorRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('vendors')
          .insert(vendorRecords);

        if (!insertError) {
          importedVendors = vendorRecords.length;
          samples.vendors = vendorNames.slice(0, 10);
        } else {
          console.error('Vendor insert error:', insertError);
          // Return the error in the sample so we can debug in UI
          samples.vendors = [`ERROR: ${insertError.message || JSON.stringify(insertError)}`];
        }
      } else {
        samples.vendors = ["NO VENDORS FOUND AFTER EXTRACTION"];
      }
    }

    // 3. Parse Chart of Accounts
    const chartFile = findFile(['CHART.DAT', 'COA.DAT', 'ACCOUNTS.DAT']);
    if (chartFile) {
      console.log('Parsing chart from:', chartFile);
      const data = await contents.files[chartFile].async('uint8array');
      const strings = extractStrings(data, 4, 60);

      const accountNames = [...new Set(strings)]
        .filter(s => s.length >= 5 && s.length <= 50)
        .filter(s => /^[A-Z]/.test(s))
        .filter(s => !s.toUpperCase().includes('.DAT'))
        .slice(0, 100);

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

        if (!insertError) {
          importedChart = accountRecords.length;
          samples.accounts = accountNames.slice(0, 10);
        } else {
          console.error('Chart insert error:', insertError);
        }
      }
    }

    // 4. Parse Employees (EMPLOYEE.DAT)
    const empFile = findFile(['EMPLOYEE.DAT', 'EMP.DAT']);
    if (empFile) {
      console.log('Parsing employees from:', empFile);
      const data = await contents.files[empFile].async('uint8array');
      const strings = extractStrings(data, 4);

      const empNames = [...new Set(strings)]
        .filter(s => s.length >= 4 && s.length <= 40)
        .filter(s => /^[A-Z][a-z]+/.test(s)) // Strict Title case for names
        .filter(s => !['Employee', 'Hourly', 'Salary', 'S.S.', 'Fed'].includes(s))
        .slice(0, 50);

      const empRecords = empNames.map((name, idx) => ({
        company_id: companyId,
        employee_code: `EMP-${idx + 100}`,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || 'Unknown',
        email: `${name.replace(/\s/g, '.').toLowerCase()}@company.com`,
        isActive: true,
        // Required fields with defaults
        department: 'General',
        jobTitle: 'Staff'
      }));

      // Map to DB columns (snake_case) inside the insert if needed, or rely on Drizzle/Supabase mapping
      // Since we are using Supabase client directly, we need exact column names
      const dbEmpRecords = empRecords.map(r => ({
        company_id: r.company_id,
        employee_code: r.employee_code,
        first_name: r.firstName,
        last_name: r.lastName,
        email: r.email,
        is_active: r.isActive
      }));

      if (dbEmpRecords.length > 0) {
        const { error: empError } = await supabase.from('employees').insert(dbEmpRecords);
        if (!empError) importedEmployees = dbEmpRecords.length;
        else console.error('Employee import error:', empError);
      }
    }

    // 5. Parse Inventory Items (LINEITEM.DAT)
    const itemFile = findFile(['LINEITEM.DAT', 'ITEM.DAT', 'INVENTORY.DAT']);
    if (itemFile) {
      console.log('Parsing items from:', itemFile);
      const data = await contents.files[itemFile].async('uint8array');
      const strings = extractStrings(data, 4);

      const itemNames = [...new Set(strings)]
        .filter(s => s.length >= 4 && s.length <= 50)
        .filter(s => /^[A-Z0-9]/.test(s))
        .filter(s => !['Item', 'Stock', 'Description', 'GL Account'].includes(s))
        .slice(0, 50);

      const itemRecords = itemNames.map((name, idx) => ({
        company_id: companyId,
        sku: `ITEM-${1000 + idx}`,
        name: name,
        description: name,
        unit_of_measure: 'Each',
        cost_price: '0',
        selling_price: '0',
        is_active: true
      }));

      if (itemRecords.length > 0) {
        const { error: itemError } = await supabase.from('items').insert(itemRecords);
        if (!itemError) importedItems = itemRecords.length;
        else console.error('Item import error:', itemError);
      }
    }

    return {
      success: true,
      data: {
        customers: importedCustomers,
        vendors: importedVendors,
        accounts: importedChart,
        employees: importedEmployees,
        items: importedItems,
        samples
      }
    };
  } catch (error: any) {
    console.error('PTB import failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during import',
      data: { customers: 0, vendors: 0, accounts: 0, employees: 0, items: 0, samples: { customers: [], vendors: [], accounts: [] } }
    };
  }
}

/**
 * Export Customers to CSV (Peachtree Format)
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

    // Peachtree Standard Headers
    const headers = [
      'Customer ID',
      'Customer Name',
      'Contact',
      'Address Line 1',
      'City',
      'State',
      'Zip',
      'Country',
      'Telephone 1',
      'E-mail',
      'Tax ID'
    ];

    const rows = customers.map(c => [
      c.customer_number,
      c.name,
      '', // Contact
      c.billing_address?.street || '',
      c.billing_address?.city || '',
      c.billing_address?.state || '',
      c.billing_address?.zipCode || '',
      c.billing_address?.country || '',
      c.phone || '',
      c.email || '',
      c.tax_id || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Vendors to CSV (Peachtree Format)
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

    const headers = [
      'Vendor ID',
      'Vendor Name',
      'Contact',
      'Address Line 1',
      'City',
      'State',
      'Zip',
      'Country',
      'Telephone 1',
      'E-mail',
      'Tax ID'
    ];

    const rows = vendors.map(v => [
      v.vendor_number,
      v.name,
      '', // Contact
      v.address?.street || '',
      v.address?.city || '',
      v.address?.state || '',
      v.address?.zipCode || '',
      v.address?.country || '',
      v.phone || '',
      v.email || '',
      v.tax_id || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Chart of Accounts to CSV (Peachtree Format)
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

    const headers = ['Account ID', 'Description', 'Account Type', 'Inactive'];

    const rows = accounts.map(a => [
      a.account_number,
      a.account_name,
      a.type, // TODO: Map internal types (ASSET) to Peachtree types (Cash, Accounts Receivable, etc.) if needed
      a.is_active ? 'FALSE' : 'TRUE'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Export Journal Entries to CSV (General Ledger)
 */
/**
 * Export Journal Entries to CSV (Sage 50 Import Compatible)
 * Format: Date, Reference, Account ID, Description, Amount
 * Note: Amount is Positive for Debit, Negative for Credit
 */
export async function exportJournalEntriesToCSV(): Promise<ActionResult<string>> {
  try {
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_lines (
          *,
          account:chart_of_accounts (
            account_number,
            account_name
          )
        )
      `)
      .order('date', { ascending: true });

    if (error) throw error;
    if (!entries || entries.length === 0) {
      return { success: false, error: 'No journal entries found to export' };
    }

    // Sage 50 US / Peachtree Standard Import Headers
    const headers = [
      'Date',
      'Reference',
      'Account ID',
      'Description',
      'Amount'
    ];

    const rows: string[][] = [];

    entries.forEach((entry: any) => {
      // Format Date as MM/DD/YYYY (Standard US/Peachtree format)
      const dateObj = new Date(entry.date);
      const dateStr = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

      if (entry.lines && entry.lines.length > 0) {
        entry.lines.forEach((line: any) => {
          // Calculate Signed Amount (Debit +, Credit -)
          const debit = parseFloat(line.debit || '0');
          const credit = parseFloat(line.credit || '0');
          // If both exist (rare), net them. Usually one is 0.
          const amount = debit - credit;

          rows.push([
            dateStr,
            entry.reference || 'REF', // Reference is required
            line.account?.account_number || line.account_id || '',
            line.description || entry.description || '',
            amount.toFixed(2) // 2 decimal places
          ]);
        });
      }
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
