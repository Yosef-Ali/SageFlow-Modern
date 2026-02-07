/**
 * PTB File Parser for SageFlow
 * 
 * PTB files are Peachtree/Sage 50 backup files (ZIP archives containing .DAT files).
 * DAT files use Btrieve binary format — we extract readable ASCII strings from them.
 */

import JSZip from 'jszip';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance?: number;
}

export interface ParsedVendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance?: number;
}

export interface ParsedAccount {
  accountNumber: string;
  accountName: string;
  type: AccountType;
  balance?: number;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface ParsedInventoryItem {
  itemCode: string;
  itemName: string;
  description?: string;
  unitPrice?: number;
  costPrice?: number;
  quantity?: number;
}

export interface ParsedJournalEntry {
  entryId: string;
  date?: string;
  description?: string;
  reference?: string;
  debit?: number;
  credit?: number;
  accountNumber?: string;
  type?: string;
}

export interface ParsedEmployee {
  id: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
}

export interface PtbParseResult {
  success: boolean;
  customers: ParsedCustomer[];
  vendors: ParsedVendor[];
  accounts: ParsedAccount[];
  inventoryItems: ParsedInventoryItem[];
  journalEntries: ParsedJournalEntry[];
  employees: ParsedEmployee[];
  fileInfo: {
    totalFiles: number;
    foundDataFiles: string[];
    isEncrypted: boolean;
    version?: string;
    companyName?: string;
  };
  errors: string[];
  summary: {
    transactionCount: number;
    dateRange?: { from: string; to: string };
  };
}

// ─── DAT File Patterns ──────────────────────────────────────────────────────

const FILE_PATTERNS: Record<string, string[]> = {
  customer:  ['CUSTOMER', 'CUST', 'CLIENT', 'AR_CUST'],
  vendor:    ['VENDOR', 'VEND', 'VNDR', 'SUPPLIER', 'AP_VEND'],
  account:   ['CHART', 'ACCOUNT', 'COA', 'GL_CHART', 'GLACCT', 'GL_ACCT'],
  inventory: ['LINEITEM', 'INVENT', 'ITEM', 'STOCK', 'PRODUCT'],
  journal:   ['JRNLHDR', 'JOURNAL', 'JRNL'],
  employee:  ['EMPLOYEE', 'EMP', 'PAYROLL', 'STAFF'],
};

// Technical/system strings to always ignore
const IGNORE_WORDS = new Set([
  'null', 'true', 'false', 'date', 'time', 'default', 'group', 'password',
  'access', 'rights', 'period', 'year', 'version', 'mode', 'user', 'key',
  'arial', 'times', 'courier', 'verdana', 'tahoma', 'calibri', 'font',
  'style', 'printer', 'landscape', 'portrait', 'audit', 'gross', 'regular',
  'net', 'withholding', 'balance', 'sheet', 'profit', 'loss', 'airborne',
  'airborneq', 'dupf', 'dixt', 'others', 'customer', 'vendor', 'employee',
  'inventory', 'payment', 'supplies', 'cost', 'vehicle', 'building', 'sales',
  'purchase', 'office', 'general', 'journal', 'report', 'template', 'form',
  'system', 'backup', 'restore', 'import', 'export', 'filter', 'total',
  'subtotal', 'amount', 'quantity', 'price', 'rate', 'percent', 'number',
]);

// ─── Core Binary String Extractor ───────────────────────────────────────────

/**
 * Extract printable ASCII strings from binary data (like Unix `strings` command).
 * This is the most reliable way to get text from Btrieve DAT files.
 */
function extractStrings(data: Uint8Array, minLen = 4): string[] {
  const text = new TextDecoder('latin1').decode(data);
  const matches = text.match(/[\x20-\x7E]{4,100}/g) || [];
  return matches.map(m => m.trim()).filter(m => m.length >= minLen);
}

// ─── Name Filtering ─────────────────────────────────────────────────────────

/**
 * Clean binary prefix junk from a string (e.g., 'eEthio' → 'Ethio')
 */
function cleanString(s: string): string {
  let c = s.trim();
  while (c.length > 2 && !/^[A-Z0-9]/.test(c)) c = c.substring(1);
  return c;
}

/**
 * Filter extracted strings to find real business/person names.
 * Rejects binary garbage, short codes, and system keywords.
 */
function filterNames(strings: string[]): string[] {
  const seen = new Set<string>();

  return strings
    .map(cleanString)
    .filter(s => {
      if (s.length < 3 || s.length > 60) return false;
      if (!/^[A-Z]/.test(s)) return false;
      if (seen.has(s)) return false;

      // Reject special characters (including ~ and @)
      if (/['"$@\[\]{}\\<>\(\)~]/.test(s)) return false;

      // Reject short CamelCase junk (ArvB, DupF, THx)
      if (s.length <= 5 && /[a-z][A-Z0-9]/.test(s)) return false;
      if (s.length <= 4 && /^[A-Z][a-z][A-Z][a-z]$/.test(s)) return false;
      if (s.length <= 4 && /^[A-Z][a-z]+[A-Z]$/.test(s)) return false;
      if (s.length <= 5 && /[0-9]/.test(s)) return false;

      // Must have vowels (unless it's a short all-caps acronym like ICRC, UNHCR)
      if (!/[aeiouAEIOU]/.test(s) && !/^[A-Z]{3,6}$/.test(s)) return false;

      // Must have lowercase letters OR be all-caps with spaces
      if (!/[a-z]/.test(s) && !/^[A-Z\s&\.]+$/.test(s)) return false;

      // Reject repeated non-word chars
      if (/([^\w\s])\1{2,}/.test(s)) return false;

      // Reject system keywords
      if (IGNORE_WORDS.has(s.toLowerCase())) return false;

      // Single/two-char uppercase fragments
      if (/^[A-Z]{1,2}$/.test(s)) return false;

      seen.add(s);
      return true;
    });
}

// ─── Account Type Guesser ───────────────────────────────────────────────────

function guessAccountType(name: string): AccountType {
  const n = name.toLowerCase();
  if (/cash|bank|receivable|inventory|equipment|asset|property|prepaid/.test(n)) return 'ASSET';
  if (/payable|loan|debt|liability|accrued|deferred/.test(n)) return 'LIABILITY';
  if (/equity|capital|retain|owner|stock|share/.test(n)) return 'EQUITY';
  if (/income|revenue|sales|service|interest\s*income/.test(n)) return 'REVENUE';
  if (/expense|cost|salary|wage|rent|utility|depreciation|transport|insurance|maintenance|supplies|pension/.test(n)) return 'EXPENSE';
  return 'EXPENSE'; // Most common default
}

// ─── Individual Data Parsers ────────────────────────────────────────────────

function parseCustomers(data: Uint8Array): ParsedCustomer[] {
  const names = filterNames(extractStrings(data));
  return names.slice(0, 100).map((name, i) => ({
    id: `CUST-${i + 1000}`,
    name,
  }));
}

function parseVendors(data: Uint8Array): ParsedVendor[] {
  const names = filterNames(extractStrings(data));
  return names.slice(0, 50).map((name, i) => ({
    id: `VEND-${i + 1000}`,
    name,
  }));
}

function parseAccounts(data: Uint8Array): ParsedAccount[] {
  const allStrings = extractStrings(data);
  const accountNumbers = allStrings.filter(s => /^\d{4,5}$/.test(s));

  const accountKeywords = /cash|bank|income|expense|tax|rent|salary|cost|asset|payable|receivable|equity|revenue|sales|petty|loan|credit|debit|maintenance|supplies|transport|property|pension|insurance|depreciation|accrued|account|interest|cooperative|dashen|awash|abyssinia|cbe|nib|oromia|wegagen/i;

  const accountNames = allStrings.filter(s => {
    if (s.length < 4 || s.length > 60) return false;
    if (!/^[A-Z]/.test(s)) return false;
    if (/['"$@\[\]{}\\<>\(\)~]/.test(s)) return false;
    if (IGNORE_WORDS.has(s.toLowerCase())) return false;
    return accountKeywords.test(s) || s.length > 10;
  });

  const unique = [...new Set(accountNames)];
  return unique.slice(0, 150).map((name, i) => ({
    accountNumber: accountNumbers[i] || `${1000 + i}`,
    accountName: name,
    type: guessAccountType(name),
  }));
}

function parseInventory(data: Uint8Array): ParsedInventoryItem[] {
  const allStrings = extractStrings(data);
  const items: ParsedInventoryItem[] = [];
  const seen = new Set<string>();

  for (const s of allStrings) {
    // Item codes like A-0001, B-0002
    const codeMatch = s.match(/^([A-Z]-\d{4}(?:\.\d)?)/);
    if (codeMatch && !seen.has(codeMatch[1])) {
      seen.add(codeMatch[1]);
      items.push({ itemCode: codeMatch[1], itemName: codeMatch[1] });
      continue;
    }

    // Product names
    const cleaned = s.replace(/^[^A-Za-z]+/, '').trim();
    if (cleaned.length < 4 || cleaned.length > 60) continue;
    if (!/^[A-Z]/.test(cleaned)) continue;
    if (/[{}\\|<>@#$%^&*]/.test(cleaned)) continue;
    if (!/[aeiouAEIOU]/.test(cleaned)) continue;
    if (seen.has(cleaned)) continue;
    if (IGNORE_WORDS.has(cleaned.toLowerCase())) continue;

    seen.add(cleaned);
    items.push({ itemCode: `ITEM-${items.length + 1}`, itemName: cleaned });
  }

  return items.slice(0, 500);
}

function parseJournals(data: Uint8Array): ParsedJournalEntry[] {
  const allStrings = extractStrings(data);
  const entries: ParsedJournalEntry[] = [];
  const seen = new Set<string>();

  for (const s of allStrings) {
    // Transaction IDs: FS-00102, GJ-00001, PV-50100, AP-xxxxx, AR-xxxxx, CD-xxxxx, CR-xxxxx
    const idMatch = s.match(/^([A-Z]{2}-\d{5})$/);
    if (idMatch && !seen.has(idMatch[1])) {
      seen.add(idMatch[1]);
      entries.push({
        entryId: idMatch[1],
        type: idMatch[1].split('-')[0],
        description: `Transaction ${idMatch[1]}`,
      });
    }
  }

  return entries;
}

function parseEmployees(data: Uint8Array): ParsedEmployee[] {
  // Try with shorter min length since names can be short (e.g. "Abebe")
  let names = filterNames(extractStrings(data, 3));
  
  // If binary Btrieve with no readable strings, try scanning for
  // name-like patterns in the raw bytes (fixed-width records)
  if (names.length === 0) {
    // Try extracting with even shorter min to find name fragments
    const raw = extractStrings(data, 3);
    names = raw.filter(s => {
      if (s.length < 4 || s.length > 40) return false;
      if (!/^[A-Z][a-z]/.test(s)) return false; // Must start Title Case
      if (/[0-9'"$@\[\]{}\\<>\(\)~]/.test(s)) return false;
      if (!/[aeiou]/i.test(s)) return false;
      if (IGNORE_WORDS.has(s.toLowerCase())) return false;
      return true;
    });
    names = [...new Set(names)];
  }

  return names.slice(0, 200).map((name, i) => ({
    id: `EMP-${i + 1000}`,
    name,
  }));
}

// ─── File Finder ────────────────────────────────────────────────────────────

/**
 * Find a DAT file in the archive matching known patterns (case-insensitive).
 */
function findDatFile(files: string[], patterns: string[]): string | null {
  // Priority 1: Exact .DAT match
  for (const f of files) {
    const upper = f.toUpperCase();
    for (const p of patterns) {
      if (upper.includes(p) && upper.endsWith('.DAT')) return f;
    }
  }
  // Priority 2: Any extension match
  for (const f of files) {
    const upper = f.toUpperCase();
    for (const p of patterns) {
      if (upper.includes(p)) return f;
    }
  }
  return null;
}

// ─── Vendor Fallback Scanner ────────────────────────────────────────────────

/**
 * If VENDOR.DAT yields 0 records, scan other DAT files to find vendor data.
 * This handles cases where vendor data is in an unexpected file.
 */
async function scanForVendors(
  zip: JSZip,
  allFiles: string[],
  alreadyParsed: Set<string>
): Promise<{ file: string; vendors: ParsedVendor[] } | null> {
  // Skip files we already parsed and known non-vendor files
  const skipPattern = /AUDIT|TRAIL|LOG|BACKUP|JRNL|CHART|CUST|GLACCT|GENLED|TICKET|PHASE|JOB|GENERAL|INV|COST|ITEM|ASSEMBLY|QTY|PRICE|REPORT|RPT|FORM|TEMPLATE|EVENT|PERM|ROLE|USER|ALARM|ALERT|NOTIF/i;

  const candidates = allFiles.filter(f =>
    !alreadyParsed.has(f) && !skipPattern.test(f) && f.toUpperCase().endsWith('.DAT')
  );

  let best: { file: string; vendors: ParsedVendor[]; score: number } | null = null;

  for (const candidate of candidates) {
    try {
      const data = await zip.files[candidate].async('uint8array');
      const vendors = parseVendors(data);
      if (vendors.length > 0) {
        const score = vendors.length * 10;
        if (!best || score > best.score) {
          best = { file: candidate, vendors, score };
        }
      }
    } catch { /* skip unreadable files */ }
  }

  return best ? { file: best.file, vendors: best.vendors } : null;
}

// ─── Main Parser ────────────────────────────────────────────────────────────

/**
 * Parse a Peachtree .ptb backup file and extract all data.
 */
export async function parsePtbFile(file: File): Promise<PtbParseResult> {
  const result: PtbParseResult = {
    success: false,
    customers: [],
    vendors: [],
    accounts: [],
    inventoryItems: [],
    journalEntries: [],
    employees: [],
    fileInfo: { totalFiles: 0, foundDataFiles: [], isEncrypted: false },
    errors: [],
    summary: { transactionCount: 0 },
  };

  try {
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (readErr: any) {
      result.errors.push('Failed to read file: ' + (readErr.message || 'Unknown read error'));
      return result;
    }

    const zip = new JSZip();
    let contents: JSZip;

    try {
      contents = await zip.loadAsync(arrayBuffer);
    } catch {
      result.fileInfo.isEncrypted = true;
      result.errors.push('File is encrypted or not a valid PTB archive');
      return result;
    }

    const allFiles = Object.keys(contents.files);
    result.fileInfo.totalFiles = allFiles.length;

    if (allFiles.length === 0) {
      result.fileInfo.isEncrypted = true;
      result.errors.push('PTB file appears to be empty or encrypted');
      return result;
    }

    console.log('[PTB] Files in archive:', allFiles.length);
    const parsed = new Set<string>();

    // Helper to extract a specific data type
    async function extract<T>(
      category: string,
      parser: (data: Uint8Array) => T[]
    ): Promise<{ file: string; data: T[] } | null> {
      const patterns = FILE_PATTERNS[category];
      if (!patterns) return null;

      const datFile = findDatFile(allFiles, patterns);
      if (!datFile) return null;

      try {
        const data = await contents.files[datFile].async('uint8array');
        const records = parser(data);
        parsed.add(datFile);
        result.fileInfo.foundDataFiles.push(datFile);
        console.log(`[PTB] ${category}: ${records.length} records from ${datFile}`);
        return { file: datFile, data: records };
      } catch (e) {
        console.warn(`[PTB] Failed to parse ${datFile}:`, e);
        return null;
      }
    }

    // Extract all data types
    const customers = await extract('customer', parseCustomers);
    if (customers) result.customers = customers.data;

    const accounts = await extract('account', parseAccounts);
    if (accounts) result.accounts = accounts.data;

    // Vendors: try standard file first, fallback to scan
    const vendors = await extract('vendor', parseVendors);
    if (vendors && vendors.data.length > 0) {
      result.vendors = vendors.data;
    } else {
      console.log('[PTB] Vendor file empty/missing, scanning other files...');
      const fallback = await scanForVendors(contents, allFiles, parsed);
      if (fallback) {
        result.vendors = fallback.vendors;
        result.fileInfo.foundDataFiles.push(`${fallback.file} (detected)`);
        console.log(`[PTB] Found vendors in ${fallback.file}: ${fallback.vendors.length}`);
      }
    }

    const inventory = await extract('inventory', parseInventory);
    if (inventory) result.inventoryItems = inventory.data;

    const journals = await extract('journal', parseJournals);
    if (journals) {
      result.journalEntries = journals.data;
      result.summary.transactionCount = journals.data.length;
    }

    const employees = await extract('employee', parseEmployees);
    if (employees) result.employees = employees.data;

    // Determine success
    const total = result.customers.length + result.vendors.length + result.accounts.length +
      result.inventoryItems.length + result.journalEntries.length + result.employees.length;
    result.success = total > 0;

    if (!result.success) {
      result.errors.push(
        result.fileInfo.foundDataFiles.length === 0
          ? 'No recognizable data files found in PTB archive'
          : 'Data files found but could not extract readable records (may be binary/encrypted)'
      );
    }

    return result;
  } catch (error: any) {
    result.errors.push(error.message || 'Unknown error parsing PTB file');
    return result;
  }
}

// ─── Debug Helper ───────────────────────────────────────────────────────────

export function getParseDebugInfo(result: PtbParseResult): string {
  return [
    `PTB Parse: ${result.success ? '✅' : '❌'}`,
    `Files: ${result.fileInfo.totalFiles} total, ${result.fileInfo.foundDataFiles.length} data`,
    `Data: ${result.fileInfo.foundDataFiles.join(', ') || 'None'}`,
    `Encrypted: ${result.fileInfo.isEncrypted}`,
    `Customers: ${result.customers.length}, Vendors: ${result.vendors.length}, Accounts: ${result.accounts.length}`,
    `Inventory: ${result.inventoryItems.length}, Journals: ${result.journalEntries.length}, Employees: ${result.employees.length}`,
    result.errors.length > 0 ? `Errors: ${result.errors.join('; ')}` : '',
  ].filter(Boolean).join('\n');
}
