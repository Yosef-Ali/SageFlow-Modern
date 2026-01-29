/**
 * CSV Import Service for SageFlow
 * Imports CSV files to Supabase
 */

import { 
  parseCustomersCSV, 
  parseVendorsCSV, 
  parseAccountsCSV,
  detectCSVType,
  type ParsedCSVCustomer,
  type ParsedCSVVendor,
  type ParsedCSVAccount,
} from './csv-parser';
import { supabase } from '@/lib/supabase';

export type CSVImportType = 'customers' | 'vendors' | 'accounts' | 'auto';

export interface CSVImportResult {
  success: boolean;
  type: CSVImportType;
  imported: number;
  total: number;
  samples: string[];
  error?: string;
}

/**
 * Read file as text
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Get company ID from Supabase
 */
async function getCompanyId(): Promise<string> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id')
    .limit(1);

  if (error || !companies || companies.length === 0) {
    throw new Error('No company found. Please create a company first.');
  }
  
  return companies[0].id;
}

/**
 * Import Customers from CSV
 */
export async function importCustomersCSV(file: File): Promise<CSVImportResult> {
  try {
    const text = await readFileAsText(file);
    const parseResult = parseCustomersCSV(text);

    if (!parseResult.success || parseResult.data.length === 0) {
      return {
        success: false,
        type: 'customers',
        imported: 0,
        total: 0,
        samples: [],
        error: parseResult.error || 'No customers found in CSV',
      };
    }

    const companyId = await getCompanyId();

    const records = parseResult.data.map(c => ({
      company_id: companyId,
      customer_number: c.id,
      name: c.name,
      email: c.email || null,
      phone: c.phone || null,
      address: c.address || null,
      is_active: true,
    }));

    const { error } = await supabase.from('customers').insert(records);

    if (error) {
      console.error('[CSV Import] Customer insert error:', error);
      return {
        success: false,
        type: 'customers',
        imported: 0,
        total: parseResult.data.length,
        samples: [],
        error: error.message,
      };
    }

    return {
      success: true,
      type: 'customers',
      imported: records.length,
      total: parseResult.totalRows,
      samples: parseResult.data.slice(0, 5).map(c => c.name),
    };
  } catch (error: any) {
    return {
      success: false,
      type: 'customers',
      imported: 0,
      total: 0,
      samples: [],
      error: error.message,
    };
  }
}

/**
 * Import Vendors from CSV
 */
export async function importVendorsCSV(file: File): Promise<CSVImportResult> {
  try {
    const text = await readFileAsText(file);
    const parseResult = parseVendorsCSV(text);

    if (!parseResult.success || parseResult.data.length === 0) {
      return {
        success: false,
        type: 'vendors',
        imported: 0,
        total: 0,
        samples: [],
        error: parseResult.error || 'No vendors found in CSV',
      };
    }

    const companyId = await getCompanyId();

    const records = parseResult.data.map(v => ({
      company_id: companyId,
      vendor_number: v.id,
      name: v.name,
      email: v.email || null,
      phone: v.phone || null,
      is_active: true,
    }));

    const { error } = await supabase.from('vendors').insert(records);

    if (error) {
      console.error('[CSV Import] Vendor insert error:', error);
      return {
        success: false,
        type: 'vendors',
        imported: 0,
        total: parseResult.data.length,
        samples: [],
        error: error.message,
      };
    }

    return {
      success: true,
      type: 'vendors',
      imported: records.length,
      total: parseResult.totalRows,
      samples: parseResult.data.slice(0, 5).map(v => v.name),
    };
  } catch (error: any) {
    return {
      success: false,
      type: 'vendors',
      imported: 0,
      total: 0,
      samples: [],
      error: error.message,
    };
  }
}

/**
 * Import Chart of Accounts from CSV
 */
export async function importAccountsCSV(file: File): Promise<CSVImportResult> {
  try {
    const text = await readFileAsText(file);
    const parseResult = parseAccountsCSV(text);

    if (!parseResult.success || parseResult.data.length === 0) {
      return {
        success: false,
        type: 'accounts',
        imported: 0,
        total: 0,
        samples: [],
        error: parseResult.error || 'No accounts found in CSV',
      };
    }

    const companyId = await getCompanyId();

    const records = parseResult.data.map(a => ({
      company_id: companyId,
      account_number: a.accountNumber,
      account_name: a.accountName,
      type: a.type,
      balance: '0',
      is_active: true,
    }));

    const { error } = await supabase.from('chart_of_accounts').insert(records);

    if (error) {
      console.error('[CSV Import] Account insert error:', error);
      return {
        success: false,
        type: 'accounts',
        imported: 0,
        total: parseResult.data.length,
        samples: [],
        error: error.message,
      };
    }

    return {
      success: true,
      type: 'accounts',
      imported: records.length,
      total: parseResult.totalRows,
      samples: parseResult.data.slice(0, 5).map(a => a.accountName),
    };
  } catch (error: any) {
    return {
      success: false,
      type: 'accounts',
      imported: 0,
      total: 0,
      samples: [],
      error: error.message,
    };
  }
}

/**
 * Auto-detect and import CSV
 */
export async function importCSVAuto(file: File): Promise<CSVImportResult> {
  const text = await readFileAsText(file);
  const detectedType = detectCSVType(text);

  switch (detectedType) {
    case 'customers':
      return importCustomersCSV(file);
    case 'vendors':
      return importVendorsCSV(file);
    case 'accounts':
      return importAccountsCSV(file);
    default:
      return {
        success: false,
        type: 'auto',
        imported: 0,
        total: 0,
        samples: [],
        error: 'Could not detect CSV type. Please select the data type manually.',
      };
  }
}
