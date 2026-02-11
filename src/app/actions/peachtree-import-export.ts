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

function extractAmountCandidates(data: Uint8Array, min = 0.01, max = 1_000_000_000) {
  const decoder = new TextDecoder('iso-8859-1');
  const content = decoder.decode(data);
  const regex = /-?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;
  const matches = content.match(regex) || [];
  return matches
    .map(value => parseFloat(value.replace(/,/g, '')))
    .filter(value => Number.isFinite(value) && value >= min && value <= max);
}

/**
 * Extract monetary values from PTB journal row data.
 *
 * Strategy:
 * - Parse only explicit decimal amounts embedded in row content.
 * - Preserve sign so caller can map debit/credit direction.
 * - Drop obvious outliers/duplicates to reduce binary-noise imports.
 */
function extractMonetaryValues(data: Uint8Array): number[] {
  const decoder = new TextDecoder('iso-8859-1');
  const content = decoder.decode(data);

  const textMatches = content.match(/-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}/g) || [];
  const seen = new Set<string>();
  const values: number[] = [];

  for (const match of textMatches) {
    const normalized = match.replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);
    const rounded = Number(parsed.toFixed(2));

    if (!Number.isFinite(rounded)) continue;
    if (Math.abs(rounded) < 0.01 || Math.abs(rounded) > 1_000_000_000) continue;

    // Preserve first-seen ordering while reducing repetitive noise.
    if (!seen.has(normalized)) {
      seen.add(normalized);
      values.push(rounded);
    }
  }

  return values;
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

    // --- PRE-FETCH EXISTING DATA FOR DEDUPLICATION AND ID GENERATION ---
    const [
      { data: existingCustomers },
      { data: existingVendors },
      { data: existingAccounts },
      { data: existingItems },
      { data: existingEmployees }
    ] = await Promise.all([
      supabase.from('customers').select('id, name, customer_number').eq('company_id', companyId),
      supabase.from('vendors').select('id, name, vendor_number').eq('company_id', companyId),
      supabase.from('chart_of_accounts').select('id, account_name, account_number').eq('company_id', companyId),
      supabase.from('items').select('id, name, sku').eq('company_id', companyId),
      supabase.from('employees').select('id, first_name, last_name, employee_code').eq('company_id', companyId)
    ]);

    // Helper maps for O(1) lookups
    const existingCustomerMap = new Set(existingCustomers?.map(c => c.name.toLowerCase()));
    const existingVendorMap = new Set(existingVendors?.map(v => v.name.toLowerCase()));
    const existingAccountMap = new Set(existingAccounts?.map(a => a.account_name.toLowerCase()));
    const existingItemMap = new Set(existingItems?.map(i => i.name.toLowerCase()));
    const existingEmployeeMap = new Set(existingEmployees?.map(e => `${e.first_name} ${e.last_name}`.toLowerCase()));

    // ID Sequence Helpers
    const getNextId = (currentList: any[], field: string, prefix: string, start = 1000): number => {
      if (!currentList || currentList.length === 0) return start;
      let maxId = start;
      const regex = new RegExp(`${prefix}-(\\d+)`);
      for (const item of currentList) {
        const match = (item[field] || '').match(regex);
        if (match) {
          const num = parseInt(match[1]);
          if (!isNaN(num) && num >= maxId) maxId = num + 1;
        }
      }
      return maxId;
    };

    const getNextAccountNum = (currentList: any[], start = 1000): number => {
      if (!currentList || currentList.length === 0) return start;
      let maxId = start;
      for (const item of currentList) {
        const num = parseInt(item.account_number);
        if (!isNaN(num) && num >= maxId) maxId = num + 1;
      }
      return maxId;
    };

    let nextCustId = getNextId(existingCustomers || [], 'customer_number', 'CUST');
    let nextVendId = getNextId(existingVendors || [], 'vendor_number', 'VEND');
    let nextItemId = getNextId(existingItems || [], 'sku', 'SKU-[A-Z]+', 1000); // Only tracking numeric part robustly might be hard with SKU-CAT-NUM, simplified
    let nextEmpId = getNextId(existingEmployees || [], 'employee_code', 'EMP');
    let nextAccountNum = getNextAccountNum(existingAccounts || []);

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
      if (filename) {
        console.log(`[Import] Found file: ${filename} for pattern ${namePart}`);
        return await loadedZip.files[filename].async('uint8array');
      } else {
        console.warn(`[Import] Missing file for pattern ${namePart}. Available: ${Object.keys(loadedZip.files).join(', ')}`);
        return null;
      }
    };

    // 1. Parse Customers (CUST.DAT)
    const custData = await getFileContent('CUST');
    if (custData) {
      const strings = extractStrings(custData, 3); // Changed from 5 to 3
      // Relaxed filter: length >= 3, starts with any alphanumeric (Title case often implies name)
      const rawNames = [...new Set(strings)].filter(s => s.length >= 3 && /^[A-Za-z0-9]/.test(s));
      console.log(`[Import] Found ${rawNames.length} potential customers`);

      const newRecords = [];
      for (const name of rawNames) {
        if (!existingCustomerMap.has(name.toLowerCase())) {
          newRecords.push({
            company_id: companyId,
            customer_number: `CUST-${nextCustId++}`,
            name,
            email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
            is_active: true,
          });
          existingCustomerMap.add(name.toLowerCase()); // Prevent dupes within same import
        }
      }

      if (newRecords.length > 0) {
        const { error } = await supabase.from('customers').insert(newRecords);
        if (!error) importedCustomers = newRecords.length;
      }
    }

    // 2. Parse Vendors (VENDOR.DAT)
    const vendData = await getFileContent('VENDOR');
    if (vendData) {
      const strings = extractStrings(vendData, 3); // Changed from 5 to 3
      const rawNames = [...new Set(strings)].filter(s => s.length >= 3 && /^[A-Za-z0-9]/.test(s));
      console.log(`[Import] Found ${rawNames.length} potential vendors`);

      const newRecords = [];
      for (const name of rawNames) {
        if (!existingVendorMap.has(name.toLowerCase())) {
          newRecords.push({
            company_id: companyId,
            vendor_number: `VEND-${nextVendId++}`,
            name,
            email: `${name.toLowerCase().replace(/\s/g, '.')}@supplier.com`,
            is_active: true,
          });
          existingVendorMap.add(name.toLowerCase());
        }
      }

      if (newRecords.length > 0) {
        const { error } = await supabase.from('vendors').insert(newRecords);
        if (!error) importedVendors = newRecords.length;
      }
    }

    // 3. Parse Chart of Accounts (CHART.DAT)
    const chartData = await getFileContent('CHART');
    let accountIds: string[] = [];

    // Refresh account IDs from DB incase we need them for Journals, 
    // but typically we just need valid IDs. We'll use existing + newly created.
    let allAccounts = existingAccounts ? [...existingAccounts] : [];

    if (chartData) {
      const strings = extractStrings(chartData, 3, 60); // min 3
      const rawNames = [...new Set(strings)]
        // Relaxed: Allow Uppercase, Titlecase, or numeric starts. Min 3 chars.
        .filter(s => /^[A-Za-z0-9]/.test(s) && s.length >= 3 && !s.includes('DAT') && !/^[A-Z]{2,4}$/.test(s));
      console.log(`[Import] Found ${rawNames.length} potential accounts`);

      const accountPatterns = [
        { pattern: /cash|bank/i, type: 'ASSET' },
        { pattern: /receivable|inventory|prepaid|asset|equipment|vehicle|building/i, type: 'ASSET' },
        { pattern: /payable|accrued|tax|loan|liability/i, type: 'LIABILITY' },
        { pattern: /capital|earnings|equity/i, type: 'EQUITY' },
        { pattern: /sales|revenue|income|service/i, type: 'REVENUE' },
        { pattern: /cost|salary|wage|rent|utility|office|expense/i, type: 'EXPENSE' },
      ];

      const newRecords = [];
      for (const name of rawNames) {
        if (!existingAccountMap.has(name.toLowerCase())) {
          let accountType: any = 'ASSET';
          for (const p of accountPatterns) {
            if (p.pattern.test(name)) {
              accountType = p.type;
              break;
            }
          }
          newRecords.push({
            company_id: companyId,
            account_number: `${nextAccountNum++}`,
            account_name: name,
            type: accountType,
            balance: '0',
            is_active: true,
          });
          existingAccountMap.add(name.toLowerCase());
        }
      }

      if (newRecords.length > 0) {
        const { data: inserted, error } = await supabase.from('chart_of_accounts').insert(newRecords).select('id, account_name, account_number');
        if (!error && inserted) {
          importedChart = newRecords.length;
          allAccounts = [...allAccounts, ...inserted];
        }
      }
    }

    accountIds = allAccounts.map(a => a.id);

    // 4. Parse Inventory Items (ITEM.DAT or INV.DAT)
    const itemData = (await getFileContent('ITEM.DAT')) || (await getFileContent('INV.DAT'));
    if (itemData) {
      const strings = extractStrings(itemData, 3, 60);
      const rawNames = [...new Set(strings)]
        .filter(s => /^[A-Za-z0-9]/.test(s) && s.length >= 3 && !s.includes('DAT'));
      console.log(`[Import] Found ${rawNames.length} potential items`);

      const newRecords = [];
      for (const name of rawNames) {
        if (!existingItemMap.has(name.toLowerCase())) {
          const skuSuffix = nextItemId++;
          newRecords.push({
            company_id: companyId,
            sku: `SKU-${name.substring(0, 3).toUpperCase()}-${skuSuffix}`,
            name,
            description: `Imported from Peachtree: ${name}`,
            unit_of_measure: 'PCS',
            type: 'PRODUCT',
            cost_price: '0',
            selling_price: '0',
            quantity_on_hand: '0',
            is_active: true,
          });
          existingItemMap.add(name.toLowerCase());
        }
      }

      if (newRecords.length > 0) {
        console.log(`[Import] Inserting ${newRecords.length} items`);
        const { error } = await supabase.from('items').insert(newRecords);
        if (error) console.error('[Import] Item insert error:', error);
        if (!error) importedItems = newRecords.length;
      }
    }

    // 5. Parse Employees (EMPLOYEE.DAT)
    const empData = await getFileContent('EMPLOYEE.DAT');
    if (empData) {
      const strings = extractStrings(empData, 3, 50);
      const rawNames = [...new Set(strings)].filter(s =>
        /^[A-Za-z0-9]/.test(s) && s.length >= 3 && !s.includes('DAT') // Relaxed to 3 chars
      );
      console.log(`[Import] Found ${rawNames.length} potential employees`);

      const newRecords = [];
      for (const name of rawNames) {
        if (!existingEmployeeMap.has(name.toLowerCase())) {
          newRecords.push({
            company_id: companyId,
            employee_code: `EMP-${nextEmpId++}`,
            first_name: name.split(' ')[0] || name,
            last_name: name.split(' ').slice(1).join(' ') || 'Imported',
            email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
            is_active: true,
          });
          existingEmployeeMap.add(name.toLowerCase());
        }
      }

      if (newRecords.length > 0) {
        const { error } = await supabase.from('employees').insert(newRecords);
        if (!error) importedEmployees = newRecords.length;
      }
    }

    // 6. Parse Journal Entries (JRNLHDR.DAT)
    const [jrnlHdrData, jrnlRowData] = await Promise.all([
      getFileContent('JRNLHDR'),
      getFileContent('JRNLROW')
    ]);
    const accountBalanceDeltas = new Map<string, number>();

    if (jrnlHdrData && accountIds.length >= 2) {
      const strings = extractStrings(jrnlHdrData, 5, 50);
      const descriptions = [...new Set(strings)].filter(s =>
        !s.includes('DAT') && s.length > 8 && /^[A-Za-z0-9]/.test(s)
      ).slice(0, 30);
      const extractedAmounts = jrnlRowData ? extractMonetaryValues(jrnlRowData) : [];
      console.log(`[Import] Found ${descriptions.length} potential journals`);
      console.log(`[Import] Extracted ${extractedAmounts.length} candidate journal amounts`);
      if (extractedAmounts.length === 0) {
        console.warn('[Import] No numeric journal amounts found in JRNLROW; skipping journal line import.');
      }

      const journalsToImport = Math.min(descriptions.length, extractedAmounts.length);

      for (let index = 0; index < journalsToImport; index++) {
        const desc = descriptions[index];
        const selectedAmount = extractedAmounts[index];
        const amount = Math.abs(selectedAmount).toFixed(2);
        if (amount === '0.00') {
          continue;
        }

        // Deterministic pairing reduces random account assignment noise.
        const acct1 = accountIds[index % accountIds.length];
        const acct2 = accountIds[(index + 1) % accountIds.length] || acct1;

        const { data: entry, error: entryError } = await supabase.from('journal_entries').insert({
          company_id: companyId,
          date: new Date().toISOString(),
          reference: `PTB-${String(index + 1).padStart(4, '0')}`,
          description: `Imported: ${desc}`,
          status: 'POSTED',
          source_type: 'MANUAL',
        }).select('id').single();

        if (!entryError && entry) {
          const isNegative = selectedAmount < 0;
          const debitAccount = isNegative ? acct2 : acct1;
          const creditAccount = isNegative ? acct1 : acct2;

          await supabase.from('journal_lines').insert([
            {
              journal_entry_id: entry.id,
              account_id: debitAccount,
              description: 'Debit',
              debit: amount,
              credit: '0',
            },
            {
              journal_entry_id: entry.id,
              account_id: creditAccount,
              description: 'Credit',
              debit: '0',
              credit: amount,
            }
          ]);
          const parsedAmount = parseFloat(amount);
          const debitDelta = accountBalanceDeltas.get(debitAccount) ?? 0;
          accountBalanceDeltas.set(debitAccount, debitDelta + parsedAmount);
          const creditDelta = accountBalanceDeltas.get(creditAccount) ?? 0;
          accountBalanceDeltas.set(creditAccount, creditDelta - parsedAmount);
          importedJournals++;
        }
      }
    }

    if (accountBalanceDeltas.size > 0) {
      const accountIdsToUpdate = Array.from(accountBalanceDeltas.keys());
      const { data: accountsToUpdate } = await supabase
        .from('chart_of_accounts')
        .select('id, balance')
        .in('id', accountIdsToUpdate);

      if (accountsToUpdate) {
        await Promise.all(
          accountsToUpdate.map(account => {
            const delta = accountBalanceDeltas.get(account.id) ?? 0;
            const currentBalance = parseFloat(account.balance || '0');
            const newBalance = (currentBalance + delta).toFixed(2);
            return supabase
              .from('chart_of_accounts')
              .update({ balance: newBalance })
              .eq('id', account.id);
          })
        );
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
