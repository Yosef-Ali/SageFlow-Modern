/**
 * CSV Parser for SageFlow
 * Handles CSV exports from Peachtree/Sage 50
 * 
 * Supports:
 * - Customers CSV
 * - Vendors CSV  
 * - Chart of Accounts CSV
 */

export interface ParsedCSVCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  balance?: number;
}

export interface ParsedCSVVendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance?: number;
}

export interface ParsedCSVAccount {
  accountNumber: string;
  accountName: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  balance?: number;
}

export interface CSVParseResult<T> {
  success: boolean;
  data: T[];
  headers: string[];
  totalRows: number;
  error?: string;
}

/**
 * Parse CSV text into rows
 */
function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : 
                    firstLine.split(',').length > firstLine.split(';').length ? ',' : ';';

  // Parse with proper quote handling
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  const rows = lines.slice(1).map(parseRow).filter(row => row.some(cell => cell.length > 0));

  return { headers, rows };
}

/**
 * Find column index by possible names
 */
function findColumn(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex(h => h.includes(name.toLowerCase().replace(/[^a-z0-9]/g, '_')));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse Customers CSV
 */
export function parseCustomersCSV(text: string): CSVParseResult<ParsedCSVCustomer> {
  try {
    const { headers, rows } = parseCSVText(text);
    
    if (rows.length === 0) {
      return { success: false, data: [], headers, totalRows: 0, error: 'No data rows found' };
    }

    // Find columns
    const idCol = findColumn(headers, 'id', 'customer_id', 'cust_id', 'number', 'customer_number', 'code');
    const nameCol = findColumn(headers, 'name', 'customer_name', 'company', 'company_name', 'full_name');
    const emailCol = findColumn(headers, 'email', 'e_mail', 'email_address');
    const phoneCol = findColumn(headers, 'phone', 'telephone', 'tel', 'phone_number', 'mobile');
    const addressCol = findColumn(headers, 'address', 'street', 'address_1', 'address1', 'billing_address');
    const cityCol = findColumn(headers, 'city', 'town');
    const balanceCol = findColumn(headers, 'balance', 'amount', 'outstanding');

    // Use first two columns if no name found
    const effectiveNameCol = nameCol !== -1 ? nameCol : (idCol === 0 ? 1 : 0);
    const effectiveIdCol = idCol !== -1 ? idCol : 0;

    const customers: ParsedCSVCustomer[] = rows.map((row, idx) => ({
      id: row[effectiveIdCol] || `CUST-${idx + 1000}`,
      name: row[effectiveNameCol] || row[0] || `Customer ${idx + 1}`,
      email: emailCol !== -1 ? row[emailCol] : undefined,
      phone: phoneCol !== -1 ? row[phoneCol] : undefined,
      address: addressCol !== -1 ? row[addressCol] : undefined,
      city: cityCol !== -1 ? row[cityCol] : undefined,
      balance: balanceCol !== -1 ? parseFloat(row[balanceCol]) || 0 : undefined,
    })).filter(c => c.name && c.name.trim().length > 0);

    return {
      success: true,
      data: customers,
      headers,
      totalRows: rows.length,
    };
  } catch (error: any) {
    return { success: false, data: [], headers: [], totalRows: 0, error: error.message };
  }
}

/**
 * Parse Vendors CSV
 */
export function parseVendorsCSV(text: string): CSVParseResult<ParsedCSVVendor> {
  try {
    const { headers, rows } = parseCSVText(text);
    
    if (rows.length === 0) {
      return { success: false, data: [], headers, totalRows: 0, error: 'No data rows found' };
    }

    const idCol = findColumn(headers, 'id', 'vendor_id', 'vend_id', 'number', 'vendor_number', 'code', 'supplier_id');
    const nameCol = findColumn(headers, 'name', 'vendor_name', 'company', 'supplier', 'supplier_name');
    const emailCol = findColumn(headers, 'email', 'e_mail', 'email_address');
    const phoneCol = findColumn(headers, 'phone', 'telephone', 'tel', 'phone_number');
    const addressCol = findColumn(headers, 'address', 'street', 'address_1');
    const balanceCol = findColumn(headers, 'balance', 'amount', 'outstanding', 'payable');

    const effectiveNameCol = nameCol !== -1 ? nameCol : (idCol === 0 ? 1 : 0);
    const effectiveIdCol = idCol !== -1 ? idCol : 0;

    const vendors: ParsedCSVVendor[] = rows.map((row, idx) => ({
      id: row[effectiveIdCol] || `VEND-${idx + 1000}`,
      name: row[effectiveNameCol] || row[0] || `Vendor ${idx + 1}`,
      email: emailCol !== -1 ? row[emailCol] : undefined,
      phone: phoneCol !== -1 ? row[phoneCol] : undefined,
      address: addressCol !== -1 ? row[addressCol] : undefined,
      balance: balanceCol !== -1 ? parseFloat(row[balanceCol]) || 0 : undefined,
    })).filter(v => v.name && v.name.trim().length > 0);

    return {
      success: true,
      data: vendors,
      headers,
      totalRows: rows.length,
    };
  } catch (error: any) {
    return { success: false, data: [], headers: [], totalRows: 0, error: error.message };
  }
}

/**
 * Parse Chart of Accounts CSV
 */
export function parseAccountsCSV(text: string): CSVParseResult<ParsedCSVAccount> {
  try {
    const { headers, rows } = parseCSVText(text);
    
    if (rows.length === 0) {
      return { success: false, data: [], headers, totalRows: 0, error: 'No data rows found' };
    }

    const numberCol = findColumn(headers, 'number', 'account_number', 'acct_no', 'account_no', 'code', 'gl_account');
    const nameCol = findColumn(headers, 'name', 'account_name', 'description', 'title', 'account');
    const typeCol = findColumn(headers, 'type', 'account_type', 'category', 'class');
    const balanceCol = findColumn(headers, 'balance', 'amount', 'debit', 'credit');

    const effectiveNumberCol = numberCol !== -1 ? numberCol : 0;
    const effectiveNameCol = nameCol !== -1 ? nameCol : (numberCol === 0 ? 1 : 0);

    const accounts: ParsedCSVAccount[] = rows.map((row, idx) => {
      const typeValue = typeCol !== -1 ? row[typeCol]?.toLowerCase() : '';
      
      return {
        accountNumber: row[effectiveNumberCol] || `${1000 + idx}`,
        accountName: row[effectiveNameCol] || row[0] || `Account ${idx + 1}`,
        type: guessAccountType(row[effectiveNameCol] || '', typeValue),
        balance: balanceCol !== -1 ? parseFloat(row[balanceCol]) || 0 : undefined,
      };
    }).filter(a => a.accountName && a.accountName.trim().length > 0);

    return {
      success: true,
      data: accounts,
      headers,
      totalRows: rows.length,
    };
  } catch (error: any) {
    return { success: false, data: [], headers: [], totalRows: 0, error: error.message };
  }
}

/**
 * Guess account type from name and type hint
 */
function guessAccountType(name: string, typeHint: string): 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE' {
  const combined = `${name} ${typeHint}`.toLowerCase();
  
  if (/cash|bank|receivable|inventory|equipment|asset|property|prepaid|fixed/i.test(combined)) {
    return 'ASSET';
  }
  if (/payable|loan|debt|liability|accrued|deferred|credit/i.test(combined)) {
    return 'LIABILITY';
  }
  if (/equity|capital|retain|owner|stock|share|drawing/i.test(combined)) {
    return 'EQUITY';
  }
  if (/income|revenue|sales|service|interest\s*income|other\s*income/i.test(combined)) {
    return 'INCOME';
  }
  if (/expense|cost|salary|wage|rent|utility|depreciation|supplies/i.test(combined)) {
    return 'EXPENSE';
  }
  
  // Try to guess from account number (common conventions)
  const numMatch = name.match(/^(\d)/);
  if (numMatch) {
    const firstDigit = numMatch[1];
    if (firstDigit === '1') return 'ASSET';
    if (firstDigit === '2') return 'LIABILITY';
    if (firstDigit === '3') return 'EQUITY';
    if (firstDigit === '4') return 'INCOME';
    if (firstDigit === '5' || firstDigit === '6') return 'EXPENSE';
  }
  
  return 'ASSET';
}

/**
 * Auto-detect CSV type from content
 */
export function detectCSVType(text: string): 'customers' | 'vendors' | 'accounts' | 'unknown' {
  const lowerText = text.toLowerCase();
  const firstLines = lowerText.split('\n').slice(0, 3).join(' ');
  
  if (/customer|client|buyer/i.test(firstLines)) return 'customers';
  if (/vendor|supplier|payable/i.test(firstLines)) return 'vendors';
  if (/account|chart|gl|ledger|debit|credit/i.test(firstLines)) return 'accounts';
  
  return 'unknown';
}
