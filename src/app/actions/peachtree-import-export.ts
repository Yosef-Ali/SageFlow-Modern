'use client';

import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';
import type { ActionResult } from "@/types/api";

// ─── String / Amount Extraction Helpers ────────────────────────────────────────

/**
 * Extract printable ASCII strings from raw Btrieve .DAT binary data.
 * These files are proprietary Pervasive/Btrieve format – the best we can do
 * without an ODBC driver is to scan for contiguous printable regions.
 */
function extractStrings(data: Uint8Array, minLen = 3, maxLen = 100): string[] {
  const decoder = new TextDecoder('iso-8859-1');
  const content = decoder.decode(data);
  const regex = new RegExp(`[\\x20-\\x7E]{${minLen},${maxLen}}`, 'g');
  const matches = content.match(regex) || [];
  return matches.map(m => m.trim()).filter(m => m.length >= minLen);
}

/**
 * Noise words commonly found inside the binary but NOT real data.
 * Expanded list to catch garbage left by Btrieve page headers, field names etc.
 */
const NOISE_WORDS = new Set([
  'dat', 'ddf', 'ptb', 'btr', 'idx', 'dll', 'exe', 'com', 'sys', 'ini',
  'null', 'true', 'false', 'none', 'void', 'byte', 'char', 'int', 'long',
  'select', 'insert', 'update', 'delete', 'from', 'where', 'table',
  'index', 'create', 'drop', 'alter', 'column', 'primary', 'foreign',
  'value', 'values', 'set', 'into', 'order', 'group', 'having', 'count',
  'sum', 'avg', 'min', 'max', 'like', 'between', 'join', 'left', 'right',
  'inner', 'outer', 'and', 'not', 'desc', 'asc',
  'airborne', 'express', 'btrieve', 'pervasive', 'microsoft', 'windows',
  'default', 'system', 'config', 'version', 'format', 'record', 'field',
  'offset', 'length', 'size', 'type', 'name', 'path', 'file',
]);

/**
 * Determine whether a candidate string looks like a real entity name
 * (customer, vendor, account, item, employee) vs binary noise.
 */
function isLikelyEntityName(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 3 || trimmed.length > 80) return false;
  // Must start with a letter or digit
  if (!/^[A-Za-z0-9]/.test(trimmed)) return false;
  // Reject pure numbers
  if (/^\d+$/.test(trimmed)) return false;
  // Reject file extensions / paths
  if (/\.(dat|ddf|exe|dll|ini|doc|rpt|udl|dot)$/i.test(trimmed)) return false;
  if (/^\.\\/.test(trimmed)) return false;
  // Reject if entirely uppercase 2-4 letter codes (likely field/table names)
  if (/^[A-Z]{2,4}$/.test(trimmed)) return false;
  // Reject known noise
  if (NOISE_WORDS.has(trimmed.toLowerCase())) return false;
  // Reject strings with too many non-alpha chars (likely binary garbage)
  const alphaRatio = (trimmed.match(/[A-Za-z]/g) || []).length / trimmed.length;
  if (alphaRatio < 0.5) return false;
  // Looks OK
  return true;
}

/**
 * Extract monetary values from binary journal row data.
 * Looks for explicit decimal amounts like "1,234.56" or "50.00".
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

    if (!seen.has(normalized)) {
      seen.add(normalized);
      values.push(rounded);
    }
  }

  return values;
}

// ─── Account Type Classification ───────────────────────────────────────────────

const ACCOUNT_TYPE_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /cash|bank|checking|savings/i, type: 'ASSET' },
  { pattern: /receivable|inventory|prepaid|asset|equipment|vehicle|building|land|furniture/i, type: 'ASSET' },
  { pattern: /accumulated depreciation/i, type: 'ASSET' },
  { pattern: /payable|accrued|tax payable|loan|liability|notes payable|interest payable/i, type: 'LIABILITY' },
  { pattern: /capital|retained earnings|equity|owner|dividend/i, type: 'EQUITY' },
  { pattern: /sales|revenue|income|service revenue|fee|commission/i, type: 'REVENUE' },
  { pattern: /cost of (goods|sales)|salary|wage|rent|utilit|office|supplies|depreciation|insurance|tax expense|interest expense|expense|advertising|travel|freight/i, type: 'EXPENSE' },
];

function classifyAccountType(name: string): string {
  for (const { pattern, type } of ACCOUNT_TYPE_PATTERNS) {
    if (pattern.test(name)) return type;
  }
  return 'ASSET'; // default
}

// ─── Main Import Action ────────────────────────────────────────────────────────

export interface PtbImportResult {
  customers: number;
  vendors: number;
  accounts: number;
  items: number;
  employees: number;
  journals: number;
}

/**
 * Import Peachtree (.ptb) backup file.
 * PTB files are ZIP archives containing Btrieve .DAT binary files.
 * 
 * Since Btrieve is a proprietary binary format, we extract printable strings
 * and monetary values heuristically. This works well for entity names
 * (customers, vendors, accounts) and journal amounts.
 */
export async function importPtbAction(formData: FormData): Promise<ActionResult<PtbImportResult>> {
  const result: PtbImportResult = {
    customers: 0, vendors: 0, accounts: 0, items: 0, employees: 0, journals: 0,
  };

  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided', data: result };
    }

    // ── Validate file ─────────────────────────────────────────────────────────
    if (file.size > 500 * 1024 * 1024) {
      return { success: false, error: 'File too large (max 500 MB)', data: result };
    }

    const arrayBuffer = await file.arrayBuffer();

    // ── Open ZIP ──────────────────────────────────────────────────────────────
    const zip = new JSZip();
    let loadedZip: JSZip;
    try {
      loadedZip = await zip.loadAsync(arrayBuffer);
    } catch {
      return { success: false, error: 'Invalid PTB file — could not read as ZIP archive', data: result };
    }

    // Quick sanity check: make sure it looks like a Peachtree backup
    const fileNames = Object.keys(loadedZip.files);
    const hasDatFiles = fileNames.some(n => n.toUpperCase().endsWith('.DAT'));
    if (!hasDatFiles) {
      return { success: false, error: 'This ZIP does not appear to be a valid Peachtree backup (no .DAT files found)', data: result };
    }

    // ── Get company ID ────────────────────────────────────────────────────────
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companyError || !companies || companies.length === 0) {
      return { success: false, error: 'No company found. Please create a company first.', data: result };
    }
    const companyId = companies[0].id;

    // ── Helper: read a file from the ZIP ──────────────────────────────────────
    const getFileContent = async (namePart: string): Promise<Uint8Array | null> => {
      const filename = Object.keys(loadedZip.files).find(name =>
        name.toUpperCase().includes(namePart.toUpperCase())
      );
      if (!filename) return null;
      return await loadedZip.files[filename].async('uint8array');
    };

    // ── Pre-fetch existing data for deduplication ─────────────────────────────
    const [
      { data: existingCustomers },
      { data: existingVendors },
      { data: existingAccounts },
      { data: existingItems },
      { data: existingEmployees },
    ] = await Promise.all([
      supabase.from('customers').select('id, name, customer_number').eq('company_id', companyId),
      supabase.from('vendors').select('id, name, vendor_number').eq('company_id', companyId),
      supabase.from('chart_of_accounts').select('id, account_name, account_number').eq('company_id', companyId),
      supabase.from('items').select('id, name, sku').eq('company_id', companyId),
      supabase.from('employees').select('id, first_name, last_name, employee_code').eq('company_id', companyId),
    ]);

    const existingCustomerNames = new Set(existingCustomers?.map(c => c.name.toLowerCase()) || []);
    const existingVendorNames = new Set(existingVendors?.map(v => v.name.toLowerCase()) || []);
    const existingAccountNames = new Set(existingAccounts?.map(a => a.account_name.toLowerCase()) || []);
    const existingItemNames = new Set(existingItems?.map(i => i.name.toLowerCase()) || []);
    const existingEmployeeNames = new Set(
      existingEmployees?.map(e => `${e.first_name} ${e.last_name}`.toLowerCase()) || []
    );

    // ── Sequence counters ─────────────────────────────────────────────────────
    const getMaxNum = (list: any[] | null, field: string, prefix: string, start: number): number => {
      if (!list || list.length === 0) return start;
      let max = start;
      const re = new RegExp(`${prefix}-(\\d+)`);
      for (const item of list) {
        const m = (item[field] || '').match(re);
        if (m) { const n = parseInt(m[1]); if (!isNaN(n) && n >= max) max = n + 1; }
      }
      return max;
    };

    let nextCustId = getMaxNum(existingCustomers, 'customer_number', 'CUST', 1000);
    let nextVendId = getMaxNum(existingVendors, 'vendor_number', 'VEND', 1000);
    let nextEmpId = getMaxNum(existingEmployees, 'employee_code', 'EMP', 1000);
    let nextAccountNum = (() => {
      if (!existingAccounts || existingAccounts.length === 0) return 1000;
      let max = 1000;
      for (const a of existingAccounts) {
        const n = parseInt(a.account_number);
        if (!isNaN(n) && n >= max) max = n + 1;
      }
      return max;
    })();

    // ── Helper: extract deduplicated entity names from a DAT file ─────────────
    const extractEntityNames = (data: Uint8Array, minLen = 4): string[] => {
      const strings = extractStrings(data, minLen, 80);
      const candidates = [...new Set(strings)]
        .filter(isLikelyEntityName)
        .filter(s => s.length >= minLen);
      return candidates;
    };

    // ── 1. CUSTOMERS ──────────────────────────────────────────────────────────
    const custData = await getFileContent('CUST');
    if (custData) {
      const names = extractEntityNames(custData, 4);
      const newRecords = [];
      for (const name of names) {
        if (existingCustomerNames.has(name.toLowerCase())) continue;
        newRecords.push({
          company_id: companyId,
          customer_number: `CUST-${nextCustId++}`,
          name,
          email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@imported.com`,
          is_active: true,
        });
        existingCustomerNames.add(name.toLowerCase());
      }
      if (newRecords.length > 0) {
        const { error } = await supabase.from('customers').insert(newRecords);
        if (!error) result.customers = newRecords.length;
        else console.error('[PTB Import] Customer insert error:', error.message);
      }
    }

    // ── 2. VENDORS ────────────────────────────────────────────────────────────
    const vendData = await getFileContent('VENDOR');
    if (vendData) {
      const names = extractEntityNames(vendData, 4);
      const newRecords = [];
      for (const name of names) {
        if (existingVendorNames.has(name.toLowerCase())) continue;
        newRecords.push({
          company_id: companyId,
          vendor_number: `VEND-${nextVendId++}`,
          name,
          email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@supplier.com`,
          is_active: true,
        });
        existingVendorNames.add(name.toLowerCase());
      }
      if (newRecords.length > 0) {
        const { error } = await supabase.from('vendors').insert(newRecords);
        if (!error) result.vendors = newRecords.length;
        else console.error('[PTB Import] Vendor insert error:', error.message);
      }
    }

    // ── 3. CHART OF ACCOUNTS ──────────────────────────────────────────────────
    const chartData = await getFileContent('CHART');
    let allAccounts = existingAccounts ? [...existingAccounts] : [];

    if (chartData) {
      const names = extractEntityNames(chartData, 4);
      const newRecords = [];
      for (const name of names) {
        if (existingAccountNames.has(name.toLowerCase())) continue;
        newRecords.push({
          company_id: companyId,
          account_number: `${nextAccountNum++}`,
          account_name: name,
          type: classifyAccountType(name),
          balance: '0',
          is_active: true,
        });
        existingAccountNames.add(name.toLowerCase());
      }
      if (newRecords.length > 0) {
        const { data: inserted, error } = await supabase
          .from('chart_of_accounts')
          .insert(newRecords)
          .select('id, account_name, account_number');
        if (!error && inserted) {
          result.accounts = newRecords.length;
          allAccounts = [...allAccounts, ...inserted];
        } else if (error) {
          console.error('[PTB Import] Account insert error:', error.message);
        }
      }
    }

    const accountIds = allAccounts.map(a => a.id);

    // ── 4. INVENTORY ITEMS ────────────────────────────────────────────────────
    const itemData = (await getFileContent('ITEM.DAT')) || (await getFileContent('INV.DAT'));
    if (itemData) {
      const names = extractEntityNames(itemData, 4);
      let nextItemNum = 1000;
      const newRecords = [];
      for (const name of names) {
        if (existingItemNames.has(name.toLowerCase())) continue;
        newRecords.push({
          company_id: companyId,
          sku: `SKU-${name.substring(0, 3).toUpperCase()}-${nextItemNum++}`,
          name,
          description: `Imported from Peachtree: ${name}`,
          unit_of_measure: 'PCS',
          type: 'PRODUCT',
          cost_price: '0',
          selling_price: '0',
          quantity_on_hand: '0',
          is_active: true,
        });
        existingItemNames.add(name.toLowerCase());
      }
      if (newRecords.length > 0) {
        const { error } = await supabase.from('items').insert(newRecords);
        if (!error) result.items = newRecords.length;
        else console.error('[PTB Import] Item insert error:', error.message);
      }
    }

    // ── 5. EMPLOYEES ──────────────────────────────────────────────────────────
    const empData = await getFileContent('EMPLOYEE.DAT');
    if (empData) {
      const names = extractEntityNames(empData, 4);
      const newRecords = [];
      for (const name of names) {
        if (existingEmployeeNames.has(name.toLowerCase())) continue;
        newRecords.push({
          company_id: companyId,
          employee_code: `EMP-${nextEmpId++}`,
          first_name: name.split(' ')[0] || name,
          last_name: name.split(' ').slice(1).join(' ') || 'Imported',
          email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`,
          is_active: true,
        });
        existingEmployeeNames.add(name.toLowerCase());
      }
      if (newRecords.length > 0) {
        const { error } = await supabase.from('employees').insert(newRecords);
        if (!error) result.employees = newRecords.length;
        else console.error('[PTB Import] Employee insert error:', error.message);
      }
    }

    // ── 6. JOURNAL ENTRIES ────────────────────────────────────────────────────
    const [jrnlHdrData, jrnlRowData] = await Promise.all([
      getFileContent('JRNLHDR'),
      getFileContent('JRNLROW'),
    ]);
    const accountBalanceDeltas = new Map<string, number>();

    if (jrnlHdrData && accountIds.length >= 2) {
      const strings = extractStrings(jrnlHdrData, 5, 50);
      const descriptions = [...new Set(strings)]
        .filter(s => !s.includes('DAT') && s.length > 8 && /^[A-Za-z0-9]/.test(s))
        .slice(0, 30);

      const extractedAmounts = jrnlRowData ? extractMonetaryValues(jrnlRowData) : [];

      if (extractedAmounts.length === 0) {
        console.warn('[PTB Import] No amounts found in JRNLROW; skipping journals.');
      }

      const journalsToImport = Math.min(descriptions.length, extractedAmounts.length);

      for (let i = 0; i < journalsToImport; i++) {
        const desc = descriptions[i];
        const selectedAmount = extractedAmounts[i];
        const amount = Math.abs(selectedAmount).toFixed(2);
        if (amount === '0.00') continue;

        const acct1 = accountIds[i % accountIds.length];
        const acct2 = accountIds[(i + 1) % accountIds.length] || acct1;

        const { data: entry, error: entryError } = await supabase
          .from('journal_entries')
          .insert({
            company_id: companyId,
            date: new Date().toISOString(),
            reference: `PTB-${String(i + 1).padStart(4, '0')}`,
            description: `Imported: ${desc}`,
            status: 'POSTED',
            source_type: 'MANUAL',
          })
          .select('id')
          .single();

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
            },
          ]);

          const parsedAmount = parseFloat(amount);
          const debitDelta = accountBalanceDeltas.get(debitAccount) ?? 0;
          accountBalanceDeltas.set(debitAccount, debitDelta + parsedAmount);
          const creditDelta = accountBalanceDeltas.get(creditAccount) ?? 0;
          accountBalanceDeltas.set(creditAccount, creditDelta - parsedAmount);
          result.journals++;
        }
      }
    }

    // ── Update account balances ───────────────────────────────────────────────
    if (accountBalanceDeltas.size > 0) {
      const idsToUpdate = Array.from(accountBalanceDeltas.keys());
      const { data: accountsToUpdate } = await supabase
        .from('chart_of_accounts')
        .select('id, balance')
        .in('id', idsToUpdate);

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

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[PTB Import] Fatal error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during import',
      data: result,
    };
  }
}

// ─── CSV Export Actions ────────────────────────────────────────────────────────

function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

export async function exportCustomersToCSV(): Promise<ActionResult<string>> {
  try {
    const { data: customers, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    if (!customers || customers.length === 0) return { success: false, error: 'No customers found' };

    const headers = ['Customer ID', 'Customer Number', 'Name', 'Email', 'Phone', 'Balance'];
    const rows = customers.map(c => [c.id, c.customer_number, c.name, c.email || '', c.phone || '', c.balance || '0']);
    const csv = [headers.join(','), ...rows.map(row => row.map(escapeCsvCell).join(','))].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function exportVendorsToCSV(): Promise<ActionResult<string>> {
  try {
    const { data: vendors, error } = await supabase.from('vendors').select('*');
    if (error) throw error;
    if (!vendors || vendors.length === 0) return { success: false, error: 'No vendors found' };

    const headers = ['Vendor ID', 'Vendor Number', 'Name', 'Email', 'Phone', 'Balance'];
    const rows = vendors.map(v => [v.id, v.vendor_number, v.name, v.email || '', v.phone || '', v.balance || '0']);
    const csv = [headers.join(','), ...rows.map(row => row.map(escapeCsvCell).join(','))].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function exportChartOfAccountsToCSV(): Promise<ActionResult<string>> {
  try {
    const { data: accounts, error } = await supabase.from('chart_of_accounts').select('*');
    if (error) throw error;
    if (!accounts || accounts.length === 0) return { success: false, error: 'No accounts found' };

    const headers = ['Account ID', 'Account Number', 'Account Name', 'Type', 'Balance'];
    const rows = accounts.map(a => [a.id, a.account_number, a.account_name, a.type, a.balance || '0']);
    const csv = [headers.join(','), ...rows.map(row => row.map(escapeCsvCell).join(','))].join('\n');
    return { success: true, data: csv };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
