/**
 * PTB Import Service for SageFlow (Client-side)
 * Works with Vite/React - all parsing happens in browser
 */

import { parsePtbFile, getParseDebugInfo, type PtbParseResult } from '@/lib/peachtree/ptb-parser';
import { supabase } from '@/lib/supabase';

export interface ImportResult {
  customers: number;
  vendors: number;
  accounts: number;
  debug?: string;
  samples?: {
    customers: string[];
    vendors: string[];
    accounts: string[];
  };
}

/**
 * Import Peachtree (.ptb) backup file
 * Client-side function that parses file and inserts to Supabase
 */
export async function importPtbFile(file: File): Promise<ImportResult> {
  // Parse the PTB file
  const parseResult = await parsePtbFile(file);
  
  // Debug logging
  console.log('[PTB Import]', getParseDebugInfo(parseResult));

  // If parsing failed completely (encrypted, etc.)
  if (!parseResult.success && parseResult.errors.length > 0) {
    return { 
      customers: 0, 
      vendors: 0, 
      accounts: 0,
      debug: parseResult.fileInfo.isEncrypted 
        ? 'PTB file is encrypted. Please use CSV export from Peachtree instead.'
        : parseResult.errors[0]
    };
  }

  // Get company ID
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .limit(1);

  if (companyError || !companies || companies.length === 0) {
    throw new Error('No company found. Please create a company first.');
  }
  
  const companyId = companies[0].id;
  let importedCustomers = 0;
  let importedVendors = 0;
  let importedAccounts = 0;

  // Import Customers
  if (parseResult.customers.length > 0) {
    const customerRecords = parseResult.customers.map(c => ({
      company_id: companyId,
      customer_number: c.id,
      name: c.name,
      email: c.email || null,
      phone: c.phone || null,
      address: c.address || null,
      is_active: true,
    }));

    const { error } = await supabase
      .from('customers')
      .insert(customerRecords);

    if (!error) {
      importedCustomers = customerRecords.length;
    } else {
      console.error('[PTB Import] Customer insert error:', error);
    }
  }

  // Import Vendors
  if (parseResult.vendors.length > 0) {
    const vendorRecords = parseResult.vendors.map(v => ({
      company_id: companyId,
      vendor_number: v.id,
      name: v.name,
      email: v.email || null,
      phone: v.phone || null,
      is_active: true,
    }));

    const { error } = await supabase
      .from('vendors')
      .insert(vendorRecords);

    if (!error) {
      importedVendors = vendorRecords.length;
    } else {
      console.error('[PTB Import] Vendor insert error:', error);
    }
  }

  // Import Chart of Accounts
  if (parseResult.accounts.length > 0) {
    const accountRecords = parseResult.accounts.map(a => ({
      company_id: companyId,
      account_number: a.accountNumber,
      account_name: a.accountName,
      type: a.type,
      balance: '0',
      is_active: true,
    }));

    const { error } = await supabase
      .from('chart_of_accounts')
      .insert(accountRecords);

    if (!error) {
      importedAccounts = accountRecords.length;
    } else {
      console.error('[PTB Import] Account insert error:', error);
    }
  }

  return {
    customers: importedCustomers,
    vendors: importedVendors,
    accounts: importedAccounts,
    samples: {
      customers: parseResult.customers.slice(0, 5).map(c => c.name),
      vendors: parseResult.vendors.slice(0, 5).map(v => v.name),
      accounts: parseResult.accounts.slice(0, 5).map(a => a.accountName),
    }
  };
}
