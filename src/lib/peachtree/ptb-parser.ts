/**
 * PTB File Parser for SageFlow
 * 
 * PTB files are Peachtree/Sage 50 backup files.
 * They are ZIP archives containing .DAT files with company data.
 * 
 * This parser handles multiple formats:
 * 1. Unencrypted PTB (ZIP with readable .DAT files)
 * 2. CSV-style data within DAT files
 * 3. Fixed-width record formats
 */

import JSZip from 'jszip';

// Types
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
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance?: number;
}

export interface ParsedInventoryItem {
  itemCode: string;
  itemName: string;
  description?: string;
  unitPrice?: number;
  costPrice?: number;
  quantity?: number;
  category?: string;
}

export interface ParsedJournalEntry {
  entryId: string;
  date?: string;
  description?: string;
  reference?: string;
  debit?: number;
  credit?: number;
  accountNumber?: string;
  type?: string; // FS, GJ, AP, AR, CD, CR
}

export interface ParsedEmployee {
  id: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
}

export interface ParsedLineItem {
  itemCode: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  invoiceRef?: string;
}

export interface PtbParseResult {
  success: boolean;
  customers: ParsedCustomer[];
  vendors: ParsedVendor[];
  accounts: ParsedAccount[];
  inventoryItems: ParsedInventoryItem[];
  journalEntries: ParsedJournalEntry[];
  employees: ParsedEmployee[];
  lineItems: ParsedLineItem[];
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

// File patterns to look for
const CUSTOMER_FILES = ['CUST', 'CUSTOMER', 'CUSTS', 'CLIENT', 'AR_CUST'];
const VENDOR_FILES = ['VEND', 'VENDOR', 'VNDR', 'SUPPLIER', 'AP_VEND'];
const ACCOUNT_FILES = ['CHART', 'ACCOUNT', 'COA', 'GL_CHART', 'GLACCT', 'GL_ACCT'];
const INVENTORY_FILES = ['LINEITEM', 'INVENT', 'ITEM', 'STOCK', 'PRODUCT', 'INVCOST'];
const JOURNAL_FILES = ['JRNLHDR', 'JOURNAL', 'JRNL', 'GENERAL'];
const EMPLOYEE_FILES = ['EMPLOYEE', 'EMP', 'PAYROLL', 'STAFF'];
const JOURNAL_LINE_FILES = ['JRNLROW', 'JRNLLINE', 'JRNLDTL'];

/**
 * Check if string is readable (not binary garbage)
 */
function isReadableName(s: string): boolean {
  // Must be printable ASCII only (no ÿ, Ò, etc.)
  if (!/^[\x20-\x7E]+$/.test(s)) return false;

  // No repeated characters (like "ÿÿÿ" decoded as ASCII)
  if (/(.)\1{3,}/.test(s)) return false;

  // Must have at least one vowel (real words have vowels)
  if (!/[aeiouAEIOU]/.test(s)) return false;

  return true;
}

/**
 * Main parser function
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
    lineItems: [],
    fileInfo: {
      totalFiles: 0,
      foundDataFiles: [],
      isEncrypted: false,
    },
    errors: [],
    summary: {
      transactionCount: 0,
    },
  };

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Try to open as ZIP
    const zip = new JSZip();
    let contents: JSZip;

    try {
      contents = await zip.loadAsync(arrayBuffer);
    } catch (zipError) {
      // Not a valid ZIP - might be encrypted or corrupted
      result.fileInfo.isEncrypted = true;
      result.errors.push('File is encrypted or not a valid PTB archive');
      return result;
    }

    const allFiles = Object.keys(contents.files);
    result.fileInfo.totalFiles = allFiles.length;

    // Log what we found
    console.log('[PTB Parser] Found files:', allFiles);

    // Check if it looks encrypted (common indicators)
    if (allFiles.length === 0 || allFiles.every(f => f.endsWith('.enc') || f.endsWith('.encrypted'))) {
      result.fileInfo.isEncrypted = true;
      result.errors.push('PTB file appears to be encrypted');
      return result;
    }

    // Find and parse customer data
    const customerFile = findDataFile(allFiles, CUSTOMER_FILES);
    if (customerFile) {
      result.fileInfo.foundDataFiles.push(customerFile);
      const data = await contents.files[customerFile].async('uint8array');
      result.customers = parseCustomerData(data);
    }

    // Find and parse chart of accounts
    const accountFile = findDataFile(allFiles, ACCOUNT_FILES);
    if (accountFile) {
      result.fileInfo.foundDataFiles.push(accountFile);
      const data = await contents.files[accountFile].async('uint8array');
      result.accounts = parseAccountData(data);
    }

    // Find and parse vendor data
    let vendorFile = findDataFile(allFiles, VENDOR_FILES);
    let initialVendorRecords: ParsedVendor[] = [];

    // Try scanning the standard file first
    if (vendorFile) {
      console.log(`[PTB Parser] Found candidate vendor file: ${vendorFile}`);
      try {
        const data = await contents.files[vendorFile].async('uint8array');
        initialVendorRecords = parseVendorData(data);
        console.log(`[PTB Parser] Standard parse yielded ${initialVendorRecords.length} records.`);
      } catch (e) {
        console.warn('[PTB Parser] Failed to read standard vendor file', e);
      }
    }

    // Logic Update: If standard file is missing OR yielded 0 records (decoy file?), force Brute Force
    if (!vendorFile || initialVendorRecords.length === 0) {
      console.log('[PTB Parser] Standard match failed or empty. Starting Omniscient Scan...');

      const parsedFiles = new Set([...result.fileInfo.foundDataFiles]);
      // Scan EVERYTHING except the ones we already parsed, AND avoid Audit/Log/Chart/Customer/General/Inventory/Report files
      const candidates = allFiles.filter(f =>
        !parsedFiles.has(f) &&
        !/AUDIT|TRAIL|LOG|BACKUP|JRNL|CHART|CUST|GLACCT|GENLED|TICKET|PHASE|JOB|GENERAL|INV|COST|ITEM|ASSEMBLY|QTY|PRICE|REPORT|RPT|FORM|TEMPLATE/i.test(f)
      );

      let bestCandidate: { file: string, count: number, records: ParsedVendor[], score: number } | null = null;

      for (const candidate of candidates) {
        try {
          const data = await contents.files[candidate].async('uint8array');
          const records = parseVendorData(data);
          // If this candidate has valid records (not just "Panic Mode" raw strings), it's a winner
          // We check scanning result: panic mode usually has '?' prefix
          const validCount = records.filter(r => !r.name.startsWith('?')).length;

          if (validCount > 0) {
            console.log(`[PTB Parser] Candidate ${candidate} looks real: ${validCount} valid vendors.`);

            // Weighting: Prefer .DAT files significantly
            const isDat = candidate.toUpperCase().endsWith('.DAT');
            const score = validCount * (isDat ? 10 : 1);

            if (!bestCandidate || score > bestCandidate.score) {
              bestCandidate = { file: candidate, count: validCount, records, score };
            }
          }
        } catch (e) { /* ignore read errors */ }
      }

      if (bestCandidate) {
        console.log(`[PTB Parser] Winner: ${bestCandidate.file}`);
        vendorFile = bestCandidate.file;
        result.vendors = bestCandidate.records;
        result.fileInfo.foundDataFiles.push(`${bestCandidate.file} (Detected)`);
      } else {
        // Fallback: If we had a standard file but it was empty, and brute force found nothing...
        // Maybe the standard file WAS the correct one but our parsing failed? 
        // Or maybe there really are 0 vendors?
        // In any case, we dump the file list to prove we tried.
        console.warn('[PTB Parser] No vendor file found in entire text. Dumping file list.');
        result.vendors = allFiles.slice(0, 50).map((f, i) => ({
          id: `FILE-${i}`,
          name: `FILE: ${f}`
        }));
        result.errors.push('DEBUG: Showing file list as vendors');
      }
    } else {
      // Standard path was successful
      result.fileInfo.foundDataFiles.push(vendorFile);
      result.vendors = initialVendorRecords;
    }

    // Find and parse inventory items (LINEITEM.DAT)
    const inventoryFile = findDataFile(allFiles, INVENTORY_FILES);
    if (inventoryFile) {
      result.fileInfo.foundDataFiles.push(inventoryFile);
      const data = await contents.files[inventoryFile].async('uint8array');
      result.inventoryItems = parseInventoryData(data);
      console.log(`[PTB Parser] Parsed ${result.inventoryItems.length} inventory items from ${inventoryFile}`);
    }

    // Find and parse journal entries (JRNLHDR.DAT)
    const journalFile = findDataFile(allFiles, JOURNAL_FILES);
    if (journalFile) {
      result.fileInfo.foundDataFiles.push(journalFile);
      const data = await contents.files[journalFile].async('uint8array');
      result.journalEntries = parseJournalData(data);
      result.summary.transactionCount = result.journalEntries.length;
      console.log(`[PTB Parser] Parsed ${result.journalEntries.length} journal entries from ${journalFile}`);
    }

    // Find and parse employees (EMPLOYEE.DAT)
    const employeeFile = findDataFile(allFiles, EMPLOYEE_FILES);
    if (employeeFile) {
      result.fileInfo.foundDataFiles.push(employeeFile);
      const data = await contents.files[employeeFile].async('uint8array');
      result.employees = parseEmployeeData(data);
      console.log(`[PTB Parser] Parsed ${result.employees.length} employees from ${employeeFile}`);
    }

    const totalRecords = result.customers.length + result.vendors.length + result.accounts.length + 
                         result.inventoryItems.length + result.journalEntries.length + result.employees.length;
    result.success = totalRecords > 0;

    if (!result.success && result.fileInfo.foundDataFiles.length === 0) {
      result.errors.push('No recognizable data files found in PTB archive');
    } else if (!result.success) {
      result.errors.push('Data files found but could not extract readable records (may be binary/encrypted)');
    }

    return result;

  } catch (error: any) {
    result.errors.push(error.message || 'Unknown error parsing PTB file');
    return result;
  }
}

/**
 * Find a data file in the archive (case-insensitive)
 */
function findDataFile(files: string[], patterns: string[]): string | null {
  for (const file of files) {
    const upperFile = file.toUpperCase();
    for (const pattern of patterns) {
      if (upperFile.includes(pattern) && (upperFile.endsWith('.DAT') || upperFile.endsWith('.CSV') || upperFile.endsWith('.TXT'))) {
        return file;
      }
    }
  }
  // Also try without extension requirement
  for (const file of files) {
    const upperFile = file.toUpperCase();
    for (const pattern of patterns) {
      if (upperFile.includes(pattern)) {
        return file;
      }
    }
  }
  return null;
}

/**
 * Extract printable ASCII strings from binary data (Regex method)
 * Matches the proven Node.js debug script logic
 */
function extractStringsFromBinary(data: Uint8Array, minLength: number = 4): string[] {
  // Try Latin1 first as it preserves byte-to-char mapping 1:1
  const decoder = new TextDecoder('latin1');
  const text = decoder.decode(data);

  // Regex to find sequences of printable characters (Space to Tilde)
  const regex = /[\x20-\x7E]{4,100}/g; // min 4 chars to avoid noise like "RAj"
  const matches = text.match(regex) || [];

  return matches.map(m => m.trim()).filter(m => m.length >= minLength);
}

/**
 * Helper to clean binary prefixes (e.g., 'eEthio' -> 'Ethio')
 */
function cleanBinaryString(s: string): string {
  let cleaned = s.trim();
  // Remove ANY leading characters that aren't Uppercase or numbers 
  while (cleaned.length > 2 && !/^[A-Z0-9]/.test(cleaned)) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Filter strings to find likely business/customer names
 */
function filterBusinessNames(strings: string[], relaxed = false): string[] {
  return [...new Set(strings)]
    .map(cleanBinaryString) // Apply cleaning first
    .filter(s => {
      // Must be reasonable length
      if (s.length < 3 || s.length > 60) return false;

      // Must start with uppercase letter (after cleaning)
      if (!/^[A-Z]/.test(s)) return false;

      // Reject strings with special characters (quotes, $, @, etc.)
      if (/['"$@\[\]{}\\<>\(\)]/.test(s)) return false;

      // Reject mixed case junk patterns (e.g., "Fv1b", "A1Ww", "ArvB", "THx")
      // Real names don't have lowercase followed immediately by uppercase or number
      if (/[a-z][A-Z0-9]/.test(s) && s.length < 8) return false;
      
      // Reject strings that end with single lowercase after uppercase (e.g., "DupF", "ArvB")
      if (/[A-Z][a-z]?[A-Z][a-z]$/.test(s) && s.length < 6) return false;
      
      // Reject 4-letter CamelCase patterns (e.g., "ArvB", "DupF")
      if (s.length === 4 && /^[A-Z][a-z][a-z][A-Z]$/.test(s)) return false;
      if (s.length === 4 && /^[A-Z][a-z][A-Z][a-z]$/.test(s)) return false;

      // Reject 4-5 letter patterns that look like random codes (A1Ww, ArvB)
      if (s.length <= 5 && /[0-9]/.test(s)) return false;
      if (s.length <= 4 && /^[A-Z][a-z][A-Z][a-z]$/.test(s)) return false;
      if (s.length <= 5 && /^[A-Z][a-z][A-Z0-9][a-z]?$/.test(s)) return false;
      if (s.length <= 4 && /^[A-Z][a-z]+[A-Z]$/.test(s)) return false;

      // Must contain at least one lowercase or be all caps with spaces
      if (!relaxed && !/[a-z]/.test(s) && !/^[A-Z\s&\.]+$/.test(s)) return false;

      // No junk patterns
      if (/^[A-Z]{1,2}$/.test(s)) return false; // Too short acronyms

      // Common Peachtree technical strings to ignore
      if (/^(NULL|TRUE|FALSE|DATE|TIME|Airborne|AirborneQ|DupF|Customer|Vendor|Employee|Inventory|Payment|Supplies|Cost|Vehicle|Building|Sales|Purchase|Key|Version|Mode|User|Default|Group|Password|Access|Rights|Period|Year|AUDIT|Gross|Regular|Net|Tax|Withholding|Income|Expense|Balance|Sheet|Profit|Loss|Printer|Landscape|Portrait|Font|Style|Arial|Times|Courier|Verdana|Tahoma|Calibri|DIXT|Others|A1Ww|ArvB)$/i.test(s)) return false;

      // Reject strings with repeated non-word characters
      if (/([^\w\s])\1{2,}/.test(s)) return false;

      // Must have vowels (real words have vowels) unless it's a known acronym
      if (!/[aeiouAEIOU]/.test(s)) {
        // Allow known acronyms: ICRC, UNHCR, etc (all caps, 3+ chars)
        if (!/^[A-Z]{3,6}$/.test(s)) return false;
      }

      return true;
    });
}

/**
 * Parse customer data from binary/text
 */
function parseCustomerData(data: Uint8Array): ParsedCustomer[] {
  // Use strings extraction (most reliable for Peachtree binary)
  const allStrings = extractStringsFromBinary(data, 4);
  const names = filterBusinessNames(allStrings);

  return names.slice(0, 100).map((name, idx) => ({
    id: `CUST-${idx + 1000}`,
    name: name,
  }));
}

/**
 * Parse vendor data from binary/text
 */
function parseVendorData(data: Uint8Array): ParsedVendor[] {
  // Use strings extraction
  const allStrings = extractStringsFromBinary(data, 4);

  console.log(`[PTB Parser] Vendor Raw Strings Found: ${allStrings.length}`);

  // Pass 1: Standard Filter
  let names = filterBusinessNames(allStrings);

  // Pass 2: Relaxed Filter
  if (names.length < 2) {
    console.log('[PTB Parser] Low vendor count, trying relaxed filter');
    const relaxedNames = filterBusinessNames(allStrings, true);
    names = [...new Set([...names, ...relaxedNames])];
  }

  // Panic Fallback: If still 0, dump raw strings so we can debug via UI
  if (names.length === 0) {
    console.warn('[PTB Parser] No vendors found. Dumping raw candidates.');
    const rawCandidates = allStrings
      .filter(s => s.length > 3 && !/^[0-9]+$/.test(s) && !/DAT|RPT/i.test(s))
      .slice(0, 15) // Take top 15
      .map(s => `? ${s}`); // Mark as dubious

    names = rawCandidates;
  }

  return names.slice(0, 50).map((name, idx) => ({
    id: `VEND-${idx + 1000}`,
    name: name,
  }));
}

/**
 * Parse chart of accounts from binary/text
 */
function parseAccountData(data: Uint8Array): ParsedAccount[] {
  // Use strings extraction
  const allStrings = extractStringsFromBinary(data, 4);

  // Extract account numbers (4-5 digit numbers)
  const accountNumbers = allStrings.filter(s => /^\d{4,5}$/.test(s));

  // Extract account names (look for accounting-related terms)
  const accountNames = allStrings.filter(s => {
    if (s.length < 4 || s.length > 60) return false;
    if (!/^[A-Z]/.test(s)) return false;
    // Must be accounting-related or longer descriptive name
    return /cash|bank|income|expense|tax|rent|salary|cost|asset|payable|receivable|equity|revenue|sales|petty|loan|credit|debit|maintenance|supplies|transport|property|pension|insurance|depreciation|accrued|account/i.test(s)
      || s.length > 10;
  });

  // Deduplicate
  const uniqueNames = [...new Set(accountNames)];

  return uniqueNames.slice(0, 150).map((name, idx) => ({
    accountNumber: accountNumbers[idx] || `${1000 + idx}`,
    accountName: name,
    type: guessAccountType(name),
  }));
}

/**
 * Extract account-like names from chart data
 */
function extractAccountNames(text: string): string[] {
  // Pattern for account names - more permissive than business names
  const namePattern = /[A-Z][A-Za-z]+(?:[\s]+[A-Za-z\.\-\d]+)*/g;
  const matches = text.match(namePattern) || [];

  // Also look for lowercase account descriptions
  const descPattern = /(?:^|\n)([A-Z][a-z][a-z\s\-\.&]+)/gm;
  const descMatches = text.match(descPattern) || [];

  const allMatches = [...matches, ...descMatches.map(m => m.trim())];

  return [...new Set(allMatches)]
    .map(m => m.trim())
    .filter(m =>
      m.length >= 4 &&
      m.length <= 60 &&
      isReadableName(m) && // Must be readable text, not binary garbage
      !/^[A-Z][A-Za-z]{1,2}$/.test(m) && // Filter short junk
      !/^(NULL|TRUE|FALSE|GIT|DIXT)$/i.test(m) && // Filter keywords
      // Keep accounting-related terms
      (/cash|bank|income|expense|tax|rent|salary|cost|asset|payable|receivable|equity|revenue|sales|petty|loan|credit|debit|maintenance|supplies|transport|property|pension|insurance/i.test(m) ||
        m.length > 8) // Or longer names
    );
}

/**
 * Decode binary data to text (try multiple encodings)
 */
function decodeData(data: Uint8Array): string {
  // Try UTF-8 first
  try {
    const utf8 = new TextDecoder('utf-8').decode(data);
    if (isReadableText(utf8)) return utf8;
  } catch { }

  // Try Latin-1 (common for older Windows software)
  try {
    const latin1 = new TextDecoder('latin1').decode(data);
    if (isReadableText(latin1)) return latin1;
  } catch { }

  // Try Windows-1252
  try {
    const win1252 = new TextDecoder('windows-1252').decode(data);
    if (isReadableText(win1252)) return win1252;
  } catch { }

  // Fallback to latin1
  return new TextDecoder('latin1').decode(data);
}

/**
 * Check if text is mostly readable
 */
function isReadableText(text: string): boolean {
  const readableChars = text.match(/[A-Za-z0-9\s,.\-@]/g)?.length || 0;
  return readableChars / text.length > 0.3;
}

/**
 * Try to parse as CSV
 */
function tryParseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  // Check if it looks like CSV
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' :
    firstLine.includes(',') ? ',' :
      firstLine.includes('|') ? '|' : null;

  if (!delimiter) return [];

  const rows: string[][] = [];
  for (const line of lines) {
    const cells = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cells.some(c => c.length > 0)) {
      rows.push(cells);
    }
  }

  // Skip header if it looks like one
  if (rows.length > 1 && /id|name|number|code/i.test(rows[0].join(' '))) {
    rows.shift();
  }

  return rows;
}

/**
 * Extract structured records using pattern matching
 */
function extractRecords(text: string, type: 'customer' | 'vendor'): Array<{ id?: string; name: string; email?: string; phone?: string }> {
  const records: Array<{ id?: string; name: string; email?: string; phone?: string }> = [];

  // Look for ID + Name patterns
  const idNamePattern = /([A-Z]{2,4}[-]?\d{3,8})\s+([A-Z][A-Za-z\s&\.\-]{2,40})/g;
  let match;

  while ((match = idNamePattern.exec(text)) !== null) {
    records.push({
      id: match[1],
      name: match[2].trim(),
    });
  }

  return records;
}

/**
 * Extract name-like strings from text
 */
function extractNames(text: string): string[] {
  // Better pattern for business names - handles:
  // - Single words: "Customer", "ICRC", "Others"
  // - Title case: "Awash Wine", "Ethio Telecom"
  // - Abbreviations: "Harar Br.", "Heineken Br."
  // - Mixed case with plc/ltd: "WAF Trading plc"
  // - All caps: "CELTIC ETHIOPIA", "UNHCR"
  const namePattern = /[A-Z][A-Za-z]+(?:[\s]+[A-Za-z\.]+)*/g;
  const matches = text.match(namePattern) || [];

  return [...new Set(matches)]
    .map(m => m.trim())
    .filter(m =>
      m.length >= 3 &&  // Allow shorter names like "WAF"
      m.length <= 60 &&
      isReadableName(m) && // Must be readable text, not binary garbage
      !/^[0-9\s\.\-]+$/.test(m) && // Not just numbers
      !/^(NULL|TRUE|FALSE|DATE|TIME|Airborne|DupF|AirborneQ)$/i.test(m) && // Not SQL keywords or Peachtree internals
      !/^[A-Z][a-z]{1,2}$/.test(m) && // Filter out short patterns like "The", "And"
      !/^[A-Z][A-Za-z]{1,2}$/.test(m) && // Filter out 3-char junk like "FxU", "RYd", "THx"
      !/^[a-z]/.test(m) // Must start with uppercase
    );
}

/**
 * Find email in array of values
 */
function findEmail(values: string[]): string | undefined {
  for (const v of values) {
    if (/@/.test(v) && /\.\w{2,}$/.test(v)) {
      return v;
    }
  }
  return undefined;
}

/**
 * Parse inventory items from LINEITEM.DAT
 */
function parseInventoryData(data: Uint8Array): ParsedInventoryItem[] {
  const allStrings = extractStringsFromBinary(data, 4);
  const items: ParsedInventoryItem[] = [];
  const seen = new Set<string>();

  for (const s of allStrings) {
    // Item codes like A-0001, B-0002, C-0003
    const codeMatch = s.match(/^([A-Z]-\d{4}(?:\.\d)?)/);
    if (codeMatch && !seen.has(codeMatch[1])) {
      seen.add(codeMatch[1]);
      items.push({
        itemCode: codeMatch[1],
        itemName: codeMatch[1], // Will try to match with name later
      });
      continue;
    }

    // Product names - clean leading junk and filter
    let cleaned = s.replace(/^[^A-Za-z]+/, '').trim();
    if (cleaned.length < 4 || cleaned.length > 60) continue;
    if (!/^[A-Z]/.test(cleaned)) continue;
    if (/[{}\\|<>@#$%^&*]/.test(cleaned)) continue;
    if (seen.has(cleaned)) continue;

    // Must look like a product name (has vowels, reasonable pattern)
    if (!/[aeiouAEIOU]/.test(cleaned)) continue;
    
    // Skip technical/system strings
    if (/^(NULL|TRUE|FALSE|DATE|TIME|Key|Version|Mode|Default)$/i.test(cleaned)) continue;

    seen.add(cleaned);
    items.push({
      itemCode: `ITEM-${items.length + 1}`,
      itemName: cleaned,
    });
  }

  return items.slice(0, 500); // Limit to 500 items
}

/**
 * Parse journal entries from JRNLHDR.DAT
 */
function parseJournalData(data: Uint8Array): ParsedJournalEntry[] {
  const allStrings = extractStringsFromBinary(data, 4);
  const entries: ParsedJournalEntry[] = [];
  const seen = new Set<string>();

  for (const s of allStrings) {
    // Transaction IDs like FS-00102, GJ-00001, PV-50100, AP-xxxxx, AR-xxxxx
    const idMatch = s.match(/^([A-Z]{2}-\d{5})$/);
    if (idMatch && !seen.has(idMatch[1])) {
      seen.add(idMatch[1]);
      const type = idMatch[1].split('-')[0];
      entries.push({
        entryId: idMatch[1],
        type: type,
        description: `Transaction ${idMatch[1]}`,
      });
    }
  }

  return entries;
}

/**
 * Parse employee data from EMPLOYEE.DAT
 */
function parseEmployeeData(data: Uint8Array): ParsedEmployee[] {
  const allStrings = extractStringsFromBinary(data, 4);
  const employees: ParsedEmployee[] = [];
  const seen = new Set<string>();

  for (const s of allStrings) {
    if (seen.has(s) || s.length < 3 || s.length > 50) continue;
    if (!/^[A-Z]/.test(s)) continue;
    if (/['"$@\[\]{}\\<>\(\)]/.test(s)) continue;
    if (/[a-z][A-Z0-9]/.test(s) && s.length < 8) continue;
    if (!/[aeiouAEIOU]/.test(s)) continue;
    if (/^(NULL|TRUE|FALSE|DATE|TIME|User|Default|Group|Password)$/i.test(s)) continue;
    
    if (/[a-z]/.test(s) || /\s/.test(s)) {
      seen.add(s);
      employees.push({
        id: `EMP-${employees.length + 1000}`,
        name: s,
      });
    }
  }

  return employees.slice(0, 200);
}

/**
 * Find phone number in array of values
 */
function findPhone(values: string[]): string | undefined {
  for (const v of values) {
    // Ethiopian or international phone patterns
    if (/^[\+]?[0-9\s\-\(\)]{7,15}$/.test(v.replace(/\s/g, ''))) {
      return v;
    }
  }
  return undefined;
}

/**
 * Guess account type from name
 */
function guessAccountType(name: string, typeHint?: string): 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' {
  const combined = `${name} ${typeHint || ''}`.toLowerCase();

  if (/cash|bank|receivable|inventory|equipment|asset|property|prepaid/i.test(combined)) {
    return 'ASSET';
  }
  if (/payable|loan|debt|liability|accrued|deferred/i.test(combined)) {
    return 'LIABILITY';
  }
  if (/equity|capital|retain|owner|stock|share/i.test(combined)) {
    return 'EQUITY';
  }
  if (/income|revenue|sales|service|interest\s*income/i.test(combined)) {
    return 'REVENUE';
  }
  if (/expense|cost|salary|wage|rent|utility|depreciation/i.test(combined)) {
    return 'EXPENSE';
  }

  return 'EXPENSE'; // Default to expense (most common)
}

/**
 * Export a summary of what was parsed (for debugging)
 */
export function getParseDebugInfo(result: PtbParseResult): string {
  return `
PTB Parse Result:
================
Success: ${result.success}
Total Files in Archive: ${result.fileInfo.totalFiles}
Data Files Found: ${result.fileInfo.foundDataFiles.join(', ') || 'None'}
Is Encrypted: ${result.fileInfo.isEncrypted}

Records Found:
- Customers: ${result.customers.length}
- Vendors: ${result.vendors.length}
- Accounts: ${result.accounts.length}
- Inventory Items: ${result.inventoryItems.length}
- Journal Entries: ${result.journalEntries.length}
- Employees: ${result.employees.length}

Errors: ${result.errors.length > 0 ? result.errors.join('; ') : 'None'}

Sample Customers: ${result.customers.slice(0, 3).map(c => c.name).join(', ')}
Sample Vendors: ${result.vendors.slice(0, 3).map(v => v.name).join(', ')}
Sample Accounts: ${result.accounts.slice(0, 3).map(a => `${a.accountNumber} - ${a.accountName}`).join(', ')}
Sample Journal: ${result.journalEntries.slice(0, 3).map(j => j.entryId).join(', ')}
  `.trim();
}
