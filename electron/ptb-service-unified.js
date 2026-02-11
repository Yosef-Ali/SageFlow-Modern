/**
 * PTB Service Unified - Complete Peachtree Backup Import/Export
 * 
 * ENHANCED VERSION combining:
 * - Direct Btrieve binary parsing (primary method)
 * - ODBC connection fallback when Peachtree is installed
 * - IEEE 754 double extraction for accurate balances
 * - Multi-source balance reconciliation
 * 
 * PTB File Structure:
 * - PTB files are ZIP archives containing Btrieve .DAT files
 * - DAT files use B-tree page structure (typically 4096-byte pages)
 * - Key files: CHART.DAT, CHARTAR.DAT, CUSTOMER.DAT, VENDOR.DAT, JRNLROW.DAT
 */

// Make Electron optional for testing
let dialog, app;
try {
  const electron = require('electron');
  dialog = electron.dialog;
  app = electron.app;
} catch {
  // Not running in Electron, will use mock or skip dialog functions
  dialog = null;
  app = { getPath: () => '/tmp' };
}

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Optional ODBC for direct Peachtree database connection
let odbc = null;
try {
  odbc = require('odbc');
} catch {
  // ODBC not available - will use binary parsing only
}

class PTBServiceUnified {
  constructor() {
    this.debugMode = true;
    this.tempDir = null;
    this.odbcAvailable = odbc !== null;
  }

  log(message) {
    if (this.debugMode) {
      console.log(`[PTB-Unified] ${message}`);
    }
  }

  // ============ ODBC CONNECTION (when Peachtree installed) ============
  
  /**
   * Try connecting via Pervasive ODBC if available
   */
  async tryODBCConnection(dataPath, password = '') {
    if (!this.odbcAvailable) {
      this.log('ODBC not available, using binary parsing');
      return null;
    }

    try {
      // Pervasive ODBC Engine Interface connection string
      const connectionString = password
        ? `DRIVER={Pervasive ODBC Engine Interface};ServerName=localhost;DBQ=${dataPath};UID=Peachtree;PWD=${password}`
        : `DRIVER={Pervasive ODBC Engine Interface};ServerName=localhost;DBQ=${dataPath};UID=Peachtree`;

      const connection = await odbc.connect(connectionString);
      this.log('ODBC connection successful');
      return connection;
    } catch (err) {
      this.log(`ODBC connection failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Query data via ODBC
   */
  async queryODBC(connection, tableName) {
    try {
      const result = await connection.query(`SELECT * FROM ${tableName}`);
      return result;
    } catch (err) {
      this.log(`ODBC query failed for ${tableName}: ${err.message}`);
      return [];
    }
  }

  // ============ BINARY PARSING UTILITIES ============

  /**
   * Extract printable ASCII strings from binary data
   */
  extractStrings(buffer, minLen = 4, maxLen = 60) {
    const strings = [];
    let current = [];

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if (byte >= 32 && byte < 127) {
        current.push(String.fromCharCode(byte));
      } else {
        if (current.length >= minLen && current.length <= maxLen) {
          const s = current.join('').trim();
          if (s.length >= minLen) {
            strings.push({ text: s, offset: i - current.length });
          }
        }
        current = [];
      }
    }
    
    if (current.length >= minLen && current.length <= maxLen) {
      const s = current.join('').trim();
      if (s.length >= minLen) {
        strings.push({ text: s, offset: buffer.length - current.length });
      }
    }

    return strings;
  }

  /**
   * Read IEEE 754 double (8 bytes, little-endian)
   */
  readDouble(buffer, offset) {
    if (offset < 0 || offset + 8 > buffer.length) return 0;
    try {
      return buffer.readDoubleLE(offset);
    } catch {
      return 0;
    }
  }

  /**
   * Validate monetary value (filter out binary noise)
   */
  isValidMonetary(val) {
    if (!Number.isFinite(val)) return false;
    if (Math.abs(val) < 0.01) return false;
    if (Math.abs(val) > 1e12) return false;
    // Filter powers of 2 (common binary artifacts)
    const abs = Math.abs(val);
    if (abs > 100 && Math.abs(Math.log2(abs) - Math.round(Math.log2(abs))) < 0.01) return false;
    return true;
  }

  /**
   * Scan for monetary double after offset
   */
  scanForAmountAfter(buffer, startOffset, maxDistance = 50) {
    const end = Math.min(buffer.length - 8, startOffset + maxDistance);
    for (let i = startOffset; i < end; i++) {
      const val = this.readDouble(buffer, i);
      if (this.isValidMonetary(val)) {
        return Math.round(val * 100) / 100;
      }
    }
    return 0;
  }

  /**
   * Scan for monetary double before offset
   */
  scanForAmountBefore(buffer, startOffset, maxDistance = 50) {
    const start = Math.max(0, startOffset - maxDistance);
    for (let i = startOffset - 8; i >= start; i--) {
      const val = this.readDouble(buffer, i);
      if (this.isValidMonetary(val)) {
        return Math.round(val * 100) / 100;
      }
    }
    return 0;
  }

  // ============ ACCOUNT TYPE INFERENCE ============
  
  inferAccountType(accountNumber) {
    try {
      const numStr = String(accountNumber).replace(/[.\-]/g, '');
      const num = parseInt(numStr.substring(0, 4), 10);
      if (num >= 1000 && num < 2000) return 'ASSET';
      if (num >= 2000 && num < 3000) return 'LIABILITY';
      if (num >= 3000 && num < 4000) return 'EQUITY';
      if (num >= 4000 && num < 5000) return 'REVENUE';
      if (num >= 5000) return 'EXPENSE';
      return 'ASSET';
    } catch {
      return 'ASSET';
    }
  }

  // ============ ENHANCED CHART OF ACCOUNTS PARSING ============
  
  /**
   * Parse CHART.DAT using Btrieve record structure
   * Pattern: [numLen] 00 [acctNum] 0c 00 00 [nameLen] 00 [name] [xx] 00 00 11 00 [balance]
   */
  parseChartDAT(buffer, chartarBuffer = null) {
    const accounts = new Map();
    const accountPattern = /^(\d{4,6}(?:\.\d+)?)$/;
    
    // PRIMARY: Parse using 0x0c separator pattern (most reliable)
    for (let i = 0; i < buffer.length - 30; i++) {
      if (buffer[i] !== 0x0c || buffer[i + 1] !== 0x00 || buffer[i + 2] !== 0x00) continue;
      
      const nameLen = buffer[i + 3];
      if (nameLen < 3 || nameLen > 60 || buffer[i + 4] !== 0x00) continue;
      
      // Read account number backwards from separator
      let acctNum = '';
      let j = i - 1;
      while (j >= 0 && buffer[j] >= 0x20 && buffer[j] <= 0x7e) {
        acctNum = String.fromCharCode(buffer[j]) + acctNum;
        j--;
      }
      acctNum = acctNum.trim();
      if (!/^\d{4}/.test(acctNum) || accounts.has(acctNum)) continue;
      
      // Read name field
      const nameStart = i + 5;
      if (nameStart + nameLen > buffer.length) continue;
      let name = '';
      for (let k = 0; k < nameLen; k++) {
        const c = buffer[nameStart + k];
        if (c === 0) break;
        name += String.fromCharCode(c);
      }
      name = name.trim();
      if (name.length < 3) continue;
      
      // Find balance: look for 0x11 0x00 marker
      const nameEnd = nameStart + nameLen;
      let balance = 0;
      for (let k = nameEnd; k < nameEnd + 20 && k + 10 < buffer.length; k++) {
        if (buffer[k] === 0x11 && buffer[k + 1] === 0x00) {
          const val = this.readDouble(buffer, k + 2);
          if (Number.isFinite(val) && Math.abs(val) < 1e12) {
            balance = Math.round(val * 100) / 100;
          }
          break;
        }
      }
      
      // Fallback scan
      if (balance === 0) {
        balance = this.scanForAmountAfter(buffer, nameEnd, 30);
      }
      
      accounts.set(acctNum, {
        account_number: acctNum,
        account_name: name,
        type: this.inferAccountType(acctNum),
        balance: balance,
        debit_total: 0,
        credit_total: 0
      });
    }
    
    // FALLBACK: String-based extraction if structured parsing found few accounts
    if (accounts.size < 5) {
      const strings = this.extractStrings(buffer, 3, 50);
      for (let i = 0; i < strings.length - 1; i++) {
        const s = strings[i].text;
        if (accountPattern.test(s) && !accounts.has(s)) {
          for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
            const name = strings[j].text;
            if (/[A-Za-z]{2,}/.test(name) && !accountPattern.test(name)) {
              const nameOffset = strings[j].offset;
              const balance = this.scanForAmountAfter(buffer, nameOffset + name.length, 30);
              accounts.set(s, {
                account_number: s,
                account_name: name.trim(),
                type: this.inferAccountType(s),
                balance: balance,
                debit_total: 0,
                credit_total: 0
              });
              break;
            }
          }
        }
      }
    }
    
    // ENHANCEMENT: Merge balances from CHARTAR.DAT
    if (chartarBuffer && accounts.size > 0) {
      this.mergeChartarBalances(chartarBuffer, accounts);
    }
    
    this.log(`Parsed ${accounts.size} accounts from CHART.DAT`);
    return accounts;
  }

  /**
   * Merge balances from CHARTAR.DAT into accounts map
   */
  mergeChartarBalances(buffer, accountsMap) {
    let balancesFound = 0;
    
    for (const [acctNum, acct] of accountsMap) {
      const searchBytes = Buffer.from(acctNum);
      let searchStart = 0;
      
      while (searchStart < buffer.length) {
        const idx = buffer.indexOf(searchBytes, searchStart);
        if (idx === -1) break;
        
        // Found account, scan for balance
        for (let offset = 40; offset < 200; offset += 8) {
          if (idx + offset + 8 > buffer.length) break;
          const val = this.readDouble(buffer, idx + offset);
          if (this.isValidMonetary(val)) {
            if (acct.balance === 0) {
              acct.balance = Math.round(val * 100) / 100;
              acct.balance_source = 'CHARTAR';
              balancesFound++;
            }
            break;
          }
        }
        searchStart = idx + 1;
      }
    }
    
    this.log(`Merged ${balancesFound} balances from CHARTAR.DAT`);
  }

  /**
   * Calculate balances from JRNLROW.DAT journal entries
   */
  parseJournalBalances(buffer, accountsMap) {
    const debits = new Map();
    const credits = new Map();
    let txCount = 0;
    
    const dataStart = 8192; // Skip header pages
    
    for (let offset = dataStart; offset < buffer.length - 256; offset += 2) {
      // Look for account number patterns
      const potentialAcct = [];
      for (let j = 0; j < 10; j++) {
        const c = buffer[offset + j];
        if (c >= 0x30 && c <= 0x39) potentialAcct.push(String.fromCharCode(c));
        else if (c === 0x2E) potentialAcct.push('.');
        else break;
      }
      
      if (potentialAcct.length >= 4) {
        const acctNum = potentialAcct.join('');
        if (accountsMap.has(acctNum)) {
          // Scan for debit/credit amounts
          for (let amtOffset = 16; amtOffset < 200; amtOffset += 8) {
            if (offset + amtOffset + 16 > buffer.length) break;
            const val1 = this.readDouble(buffer, offset + amtOffset);
            const val2 = this.readDouble(buffer, offset + amtOffset + 8);
            
            if (this.isValidMonetary(val1) || this.isValidMonetary(val2)) {
              if (this.isValidMonetary(val1) && val1 > 0) {
                debits.set(acctNum, (debits.get(acctNum) || 0) + val1);
                txCount++;
              }
              if (this.isValidMonetary(val2) && val2 > 0) {
                credits.set(acctNum, (credits.get(acctNum) || 0) + val2);
              }
              break;
            }
          }
        }
      }
    }
    
    // Update account balances based on type
    for (const [acctNum, acct] of accountsMap) {
      const debitTotal = debits.get(acctNum) || 0;
      const creditTotal = credits.get(acctNum) || 0;
      
      acct.debit_total = Math.round(debitTotal * 100) / 100;
      acct.credit_total = Math.round(creditTotal * 100) / 100;
      
      // Only overwrite if balance is 0 and we have journal data
      if (acct.balance === 0 && (debitTotal > 0 || creditTotal > 0)) {
        if (acct.type === 'ASSET' || acct.type === 'EXPENSE') {
          acct.balance = Math.round((debitTotal - creditTotal) * 100) / 100;
        } else {
          acct.balance = Math.round((creditTotal - debitTotal) * 100) / 100;
        }
        acct.balance_source = 'JRNLROW';
      }
    }
    
    this.log(`Processed ${txCount} journal entries`);
    return accountsMap;
  }

  // ============ CUSTOMER PARSING ============
  
  parseCustomers(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['AirborneQ', 'DupF', 'Customer', '.DAT', 'CUSTOMER'];
    const seen = new Set();
    const customers = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z]/.test(clean) || clean.length < 4) continue;
      if (seen.has(lower)) continue;
      
      seen.add(lower);
      const balance = this.scanForAmountAfter(buffer, item.offset + clean.length, 40);
      customers.push({ 
        customer_id: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
        name: clean, 
        balance 
      });
    }
    return customers.slice(0, 500);
  }

  // ============ VENDOR PARSING ============
  
  parseVendors(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['AirborneQ', 'Vendor', 'VENDOR', '.DAT'];
    const seen = new Set();
    const vendors = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z]/.test(clean) || clean.length < 4) continue;
      if (seen.has(lower)) continue;
      
      seen.add(lower);
      let balance = this.scanForAmountAfter(buffer, item.offset + clean.length, 40);
      if (balance === 0) balance = this.scanForAmountBefore(buffer, item.offset, 50);
      vendors.push({ 
        vendor_id: `VEND-${String(vendors.length + 1).padStart(4, '0')}`,
        name: clean, 
        balance 
      });
    }
    return vendors.slice(0, 500);
  }

  // ============ EMPLOYEE PARSING ============
  
  parseEmployees(buffer) {
    const strings = this.extractStrings(buffer, 4, 40);
    const junkPatterns = ['Employee', 'EMPLOYEE', 'Hourly', 'Salary', '.DAT'];
    const seen = new Set();
    const employees = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z][a-z]+/.test(clean) || clean.length < 4) continue;
      if (seen.has(lower)) continue;
      
      seen.add(lower);
      const parts = clean.split(/\s+/);
      employees.push({
        employee_id: `EMP-${String(employees.length + 1).padStart(4, '0')}`,
        first_name: parts[0] || clean,
        last_name: parts.slice(1).join(' ') || ''
      });
    }
    return employees.slice(0, 200);
  }

  // ============ INVENTORY PARSING ============
  
  parseInventory(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['Item', 'ITEM', 'Stock', '.DAT', 'Price Level'];
    const seen = new Set();
    const items = [];

    for (const item of strings) {
      const clean = item.text.replace(/^[^A-Za-z]+/, '').trim();
      const lower = clean.toLowerCase();
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z0-9]/.test(clean) || clean.length < 4) continue;
      if (!/[aeiouAEIOU]/.test(clean)) continue;
      if (seen.has(lower)) continue;
      
      seen.add(lower);
      const unitPrice = this.scanForAmountAfter(buffer, item.offset + clean.length, 40);
      const costPrice = unitPrice > 0 ? this.scanForAmountAfter(buffer, item.offset + clean.length + 8, 40) : 0;
      
      items.push({
        item_id: `ITEM-${String(items.length + 1).padStart(4, '0')}`,
        name: clean,
        description: clean,
        unit_price: unitPrice,
        cost_price: costPrice || unitPrice,
        quantity: 0
      });
    }
    return items.slice(0, 500);
  }

  // ============ COMPANY INFO PARSING ============
  
  parseCompanyInfo(buffer) {
    const strings = this.extractStrings(buffer, 3, 100);
    const info = { name: '', address: '', city: '', phone: '', tax_id: '' };
    
    const infoStrings = strings
      .map(s => s.text)
      .filter(s => s.length > 2 && /[A-Za-z]/.test(s));
    
    if (infoStrings.length > 0) info.name = infoStrings[0];
    if (infoStrings.length > 1) info.address = infoStrings[1];
    if (infoStrings.length > 2) info.city = infoStrings[2];
    
    const phoneMatch = strings.find(s => /\d{3}[\-\.\s]?\d{3}[\-\.\s]?\d{4}/.test(s.text));
    if (phoneMatch) info.phone = phoneMatch.text;
    
    return info;
  }

  // ============ MAIN IMPORT FUNCTION ============
  
  async importPTB(filePath) {
    const result = {
      success: false,
      data: {
        chart_of_accounts: [],
        customers: [],
        vendors: [],
        employees: [],
        inventory: [],
        company_info: null
      },
      error: null,
      stats: {},
      method: 'binary'
    };

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }

      this.log(`Opening PTB file: ${filePath}`);
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      this.log(`Found ${entries.length} files in archive`);

      // Helper to find files
      const findFile = (patterns) => {
        return entries.find(e => 
          patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase()))
        );
      };

      // Try ODBC first if available
      const extractedPath = this.tempDir || path.join(app.getPath('temp'), 'ptb-extract');
      if (!fs.existsSync(extractedPath)) fs.mkdirSync(extractedPath, { recursive: true });
      zip.extractAllTo(extractedPath, true);
      
      const odbcConnection = await this.tryODBCConnection(extractedPath);
      
      if (odbcConnection) {
        // Use ODBC for data extraction
        result.method = 'odbc';
        try {
          result.data.chart_of_accounts = await this.queryODBC(odbcConnection, 'ChartOfAccounts');
          result.data.customers = await this.queryODBC(odbcConnection, 'Customer');
          result.data.vendors = await this.queryODBC(odbcConnection, 'Vendor');
          await odbcConnection.close();
        } catch (odbcErr) {
          this.log(`ODBC query failed, falling back to binary: ${odbcErr.message}`);
          result.method = 'binary';
        }
      }

      // Binary parsing (primary or fallback)
      if (result.method === 'binary') {
        // Parse Chart of Accounts
        const chartEntry = findFile(['CHART.DAT']);
        const chartarEntry = findFile(['CHARTAR.DAT']);
        const jrnlrowEntry = findFile(['JRNLROW.DAT']);
        
        if (chartEntry) {
          const chartBuffer = chartEntry.getData();
          const chartarBuffer = chartarEntry ? chartarEntry.getData() : null;
          const accountsMap = this.parseChartDAT(chartBuffer, chartarBuffer);
          
          // Enhance with journal data
          if (jrnlrowEntry) {
            const jrnlBuffer = jrnlrowEntry.getData();
            this.parseJournalBalances(jrnlBuffer, accountsMap);
          }
          
          result.data.chart_of_accounts = Array.from(accountsMap.values());
        }

        // Parse Customers
        const custEntry = findFile(['CUSTOMER.DAT', 'CUST.DAT']);
        if (custEntry) {
          result.data.customers = this.parseCustomers(custEntry.getData());
        }

        // Parse Vendors
        const vendEntry = findFile(['VENDOR.DAT']);
        if (vendEntry) {
          result.data.vendors = this.parseVendors(vendEntry.getData());
        }

        // Parse Employees
        const empEntry = findFile(['EMPLOYEE.DAT', 'EMP.DAT']);
        if (empEntry) {
          result.data.employees = this.parseEmployees(empEntry.getData());
        }

        // Parse Inventory
        const invEntry = findFile(['LINEITEM.DAT', 'INVENTORY.DAT', 'ITEM.DAT']);
        if (invEntry) {
          result.data.inventory = this.parseInventory(invEntry.getData());
        }

        // Parse Company Info
        const companyEntry = findFile(['COMPANY.DAT', 'CMPY.DAT']);
        if (companyEntry) {
          result.data.company_info = this.parseCompanyInfo(companyEntry.getData());
        }
      }

      // Calculate statistics
      const acctWithBalances = result.data.chart_of_accounts.filter(a => a.balance !== 0).length;
      result.stats = {
        totalAccounts: result.data.chart_of_accounts.length,
        accountsWithBalances: acctWithBalances,
        totalCustomers: result.data.customers.length,
        totalVendors: result.data.vendors.length,
        totalEmployees: result.data.employees.length,
        totalInventory: result.data.inventory.length,
        extractionMethod: result.method,
        balanceSummary: {
          assets: result.data.chart_of_accounts.filter(a => a.type === 'ASSET').reduce((s, a) => s + (a.balance || 0), 0),
          liabilities: result.data.chart_of_accounts.filter(a => a.type === 'LIABILITY').reduce((s, a) => s + (a.balance || 0), 0),
          equity: result.data.chart_of_accounts.filter(a => a.type === 'EQUITY').reduce((s, a) => s + (a.balance || 0), 0),
          revenue: result.data.chart_of_accounts.filter(a => a.type === 'REVENUE').reduce((s, a) => s + (a.balance || 0), 0),
          expenses: result.data.chart_of_accounts.filter(a => a.type === 'EXPENSE').reduce((s, a) => s + (a.balance || 0), 0)
        }
      };

      result.success = true;
      this.log(`Import complete! ${result.stats.totalAccounts} accounts, ${result.stats.accountsWithBalances} with balances`);

    } catch (error) {
      result.error = error.message;
      this.log(`Import failed: ${error.message}`);
    }

    return result;
  }

  // ============ EMPLOYEE PARSING ============
  
  parseEmployees(buffer) {
    const strings = this.extractStrings(buffer, 4, 40);
    const junkPatterns = ['Employee', 'EMPLOYEE', 'Hourly', 'Salary', '.DAT'];
    const seen = new Set();
    const employees = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z][a-z]+/.test(clean) || clean.length < 4) continue;
      if (seen.has(lower)) continue;
      
      seen.add(lower);
      const parts = clean.split(/\s+/);
      employees.push({
        employee_id: `EMP-${String(employees.length + 1).padStart(4, '0')}`,
        first_name: parts[0] || clean,
        last_name: parts.slice(1).join(' ') || ''
      });
    }
    return employees.slice(0, 200);
  }

  // ============ INVENTORY PARSING ============
  
  parseInventory(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['Item', 'ITEM', 'Stock', '.DAT', 'Price Level'];
    const seen = new Set();
    const items = [];

    for (const item of strings) {
      const clean = item.text.replace(/^[^A-Za-z]+/, '').trim();
      const lower = clean.toLowerCase();
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z0-9]/.test(clean) || clean.length < 4) continue;
      if (!/[aeiouAEIOU]/.test(clean)) continue;
      if (seen.has(lower)) continue;
      
      seen.add(lower);
      const unitPrice = this.scanForAmountAfter(buffer, item.offset + clean.length, 40);
      const costPrice = unitPrice > 0 ? this.scanForAmountAfter(buffer, item.offset + clean.length + 8, 40) : 0;
      
      items.push({
        item_id: `ITEM-${String(items.length + 1).padStart(4, '0')}`,
        name: clean,
        description: clean,
        unit_price: unitPrice,
        cost_price: costPrice || unitPrice,
        quantity: 0
      });
    }
    return items.slice(0, 500);
  }

  // ============ COMPANY INFO PARSING ============
  
  parseCompanyInfo(buffer) {
    const strings = this.extractStrings(buffer, 3, 100);
    const info = { name: '', address: '', city: '', phone: '', tax_id: '' };
    
    const infoStrings = strings.map(s => s.text).filter(s => s.length > 2 && /[A-Za-z]/.test(s));
    if (infoStrings.length > 0) info.name = infoStrings[0];
    if (infoStrings.length > 1) info.address = infoStrings[1];
    if (infoStrings.length > 2) info.city = infoStrings[2];
    
    return info;
  }

  // ============ MAIN IMPORT FUNCTION ============
  
  async importPTB(filePath) {
    const result = {
      success: false,
      data: { chart_of_accounts: [], customers: [], vendors: [], employees: [], inventory: [], company_info: null },
      error: null, stats: {}, method: 'binary'
    };

    try {
      if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);

      this.log(`Opening PTB file: ${filePath}`);
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      this.log(`Found ${entries.length} files in archive`);

      const findFile = (patterns) => entries.find(e => patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase())));

      // Parse Chart of Accounts
      const chartEntry = findFile(['CHART.DAT']);
      const chartarEntry = findFile(['CHARTAR.DAT']);
      const jrnlrowEntry = findFile(['JRNLROW.DAT']);
      
      if (chartEntry) {
        const chartBuffer = chartEntry.getData();
        const chartarBuffer = chartarEntry ? chartarEntry.getData() : null;
        const accountsMap = this.parseChartDAT(chartBuffer, chartarBuffer);
        if (jrnlrowEntry) this.parseJournalBalances(jrnlrowEntry.getData(), accountsMap);
        result.data.chart_of_accounts = Array.from(accountsMap.values());
      }

      // Parse other data
      const custEntry = findFile(['CUSTOMER.DAT', 'CUST.DAT']);
      if (custEntry) result.data.customers = this.parseCustomers(custEntry.getData());

      const vendEntry = findFile(['VENDOR.DAT']);
      if (vendEntry) result.data.vendors = this.parseVendors(vendEntry.getData());

      const empEntry = findFile(['EMPLOYEE.DAT', 'EMP.DAT']);
      if (empEntry) result.data.employees = this.parseEmployees(empEntry.getData());

      const invEntry = findFile(['LINEITEM.DAT', 'INVENTORY.DAT', 'ITEM.DAT']);
      if (invEntry) result.data.inventory = this.parseInventory(invEntry.getData());

      const companyEntry = findFile(['COMPANY.DAT']);
      if (companyEntry) result.data.company_info = this.parseCompanyInfo(companyEntry.getData());

      // Calculate statistics
      const acctWithBalances = result.data.chart_of_accounts.filter(a => a.balance !== 0).length;
      result.stats = {
        totalAccounts: result.data.chart_of_accounts.length,
        accountsWithBalances: acctWithBalances,
        totalCustomers: result.data.customers.length,
        totalVendors: result.data.vendors.length,
        totalEmployees: result.data.employees.length,
        totalInventory: result.data.inventory.length,
        balanceSummary: {
          assets: result.data.chart_of_accounts.filter(a => a.type === 'ASSET').reduce((s, a) => s + (a.balance || 0), 0),
          liabilities: result.data.chart_of_accounts.filter(a => a.type === 'LIABILITY').reduce((s, a) => s + (a.balance || 0), 0),
          equity: result.data.chart_of_accounts.filter(a => a.type === 'EQUITY').reduce((s, a) => s + (a.balance || 0), 0),
          revenue: result.data.chart_of_accounts.filter(a => a.type === 'REVENUE').reduce((s, a) => s + (a.balance || 0), 0),
          expenses: result.data.chart_of_accounts.filter(a => a.type === 'EXPENSE').reduce((s, a) => s + (a.balance || 0), 0)
        }
      };

      result.success = true;
      this.log(`Import complete! ${result.stats.totalAccounts} accounts, ${acctWithBalances} with balances`);
    } catch (error) {
      result.error = error.message;
      this.log(`Import failed: ${error.message}`);
    }

    return result;
  }

  // ============ EXPORT TO PTB ============
  
  async exportPTB(data, outputPath) {
    try {
      const zip = new AdmZip();
      
      if (data.chart_of_accounts?.length > 0) {
        zip.addFile('CHART.DAT', this.generateChartDAT(data.chart_of_accounts));
        zip.addFile('CHARTAR.DAT', this.generateChartarDAT(data.chart_of_accounts));
      }
      if (data.customers?.length > 0) zip.addFile('CUSTOMER.DAT', this.generateCustomerDAT(data.customers));
      if (data.vendors?.length > 0) zip.addFile('VENDOR.DAT', this.generateVendorDAT(data.vendors));
      if (data.employees?.length > 0) zip.addFile('EMPLOYEE.DAT', this.generateEmployeeDAT(data.employees));
      if (data.inventory?.length > 0) zip.addFile('LINEITEM.DAT', this.generateInventoryDAT(data.inventory));
      
      zip.addFile('COMPANY.DAT', this.generateCompanyDAT(data.company_info || { name: 'SageFlow Export' }));
      zip.addFile('VERSION.TXT', Buffer.from('20.0.0.0'));
      zip.addFile('Details.ini', Buffer.from(this.generateDetailsIni(data)));

      zip.writeZip(outputPath);
      this.log(`Exported to ${outputPath}`);
      
      return { 
        success: true, path: outputPath,
        stats: { accounts: data.chart_of_accounts?.length || 0, customers: data.customers?.length || 0, vendors: data.vendors?.length || 0 }
      };
    } catch (error) {
      this.log(`Export failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============ DAT FILE GENERATORS ============
  
  generateChartDAT(accounts) {
    const headerSize = 4096, recordSize = 256;
    const buffer = Buffer.alloc(headerSize + accounts.length * recordSize);
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    buffer.writeUInt32LE(accounts.length, 0x04);
    buffer.writeUInt16LE(recordSize, 0x0C);
    
    let offset = headerSize;
    for (const acct of accounts) {
      buffer.write((acct.account_number || '').substring(0, 15).padEnd(15, '\0'), offset, 'ascii');
      buffer.write((acct.account_name || '').substring(0, 50).padEnd(50, '\0'), offset + 15, 'ascii');
      const typeCode = { ASSET: 1, LIABILITY: 2, EQUITY: 3, REVENUE: 4, EXPENSE: 5 }[acct.type] || 1;
      buffer.writeUInt8(typeCode, offset + 65);
      buffer.writeDoubleLE(acct.balance || 0, offset + 66);
      offset += recordSize;
    }
    return buffer;
  }

  generateChartarDAT(accounts) {
    const headerSize = 4096, recordSize = 512;
    const buffer = Buffer.alloc(headerSize + accounts.length * recordSize);
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    buffer.writeUInt32LE(accounts.length, 0x04);
    buffer.writeUInt16LE(recordSize, 0x0C);
    
    let offset = headerSize;
    for (const acct of accounts) {
      buffer.write((acct.account_number || '').substring(0, 15).padEnd(15, '\0'), offset, 'ascii');
      buffer.write((acct.account_name || '').substring(0, 50).padEnd(50, '\0'), offset + 15, 'ascii');
      const typeCode = { ASSET: 1, LIABILITY: 2, EQUITY: 3, REVENUE: 4, EXPENSE: 5 }[acct.type] || 1;
      buffer.writeInt32LE(typeCode, offset + 65);
      // Write balance at multiple offsets for compatibility
      buffer.writeDoubleLE(acct.balance || 0, offset + 80);
      buffer.writeDoubleLE(acct.balance || 0, offset + 96);
      offset += recordSize;
    }
    return buffer;
  }

  generateCustomerDAT(customers) {
    const headerSize = 4096, recordSize = 512;
    const buffer = Buffer.alloc(headerSize + customers.length * recordSize);
    buffer.write('FC', 0, 'ascii'); buffer.writeUInt32LE(customers.length, 0x04);
    let offset = headerSize;
    for (const c of customers) {
      buffer.write((c.customer_id || c.id || '').substring(0, 20).padEnd(20, '\0'), offset, 'ascii');
      buffer.write((c.name || '').substring(0, 50).padEnd(50, '\0'), offset + 20, 'ascii');
      buffer.writeDoubleLE(c.balance || 0, offset + 130);
      offset += recordSize;
    }
    return buffer;
  }

  generateVendorDAT(vendors) {
    const headerSize = 4096, recordSize = 512;
    const buffer = Buffer.alloc(headerSize + vendors.length * recordSize);
    buffer.write('FC', 0, 'ascii'); buffer.writeUInt32LE(vendors.length, 0x04);
    let offset = headerSize;
    for (const v of vendors) {
      buffer.write((v.vendor_id || v.id || '').substring(0, 20).padEnd(20, '\0'), offset, 'ascii');
      buffer.write((v.name || '').substring(0, 50).padEnd(50, '\0'), offset + 20, 'ascii');
      buffer.writeDoubleLE(v.balance || 0, offset + 130);
      offset += recordSize;
    }
    return buffer;
  }

  generateEmployeeDAT(employees) {
    const headerSize = 4096, recordSize = 256;
    const buffer = Buffer.alloc(headerSize + employees.length * recordSize);
    buffer.write('FC', 0, 'ascii'); buffer.writeUInt32LE(employees.length, 0x04);
    let offset = headerSize;
    for (const e of employees) {
      buffer.write((e.employee_id || e.id || '').substring(0, 20).padEnd(20, '\0'), offset, 'ascii');
      buffer.write((e.first_name || '').substring(0, 30).padEnd(30, '\0'), offset + 20, 'ascii');
      buffer.write((e.last_name || '').substring(0, 30).padEnd(30, '\0'), offset + 50, 'ascii');
      offset += recordSize;
    }
    return buffer;
  }

  generateInventoryDAT(items) {
    const headerSize = 4096, recordSize = 256;
    const buffer = Buffer.alloc(headerSize + items.length * recordSize);
    buffer.write('FC', 0, 'ascii'); buffer.writeUInt32LE(items.length, 0x04);
    let offset = headerSize;
    for (const i of items) {
      buffer.write((i.item_id || i.sku || '').substring(0, 20).padEnd(20, '\0'), offset, 'ascii');
      buffer.write((i.name || '').substring(0, 60).padEnd(60, '\0'), offset + 20, 'ascii');
      buffer.writeDoubleLE(i.unit_price || 0, offset + 80);
      buffer.writeDoubleLE(i.cost_price || 0, offset + 88);
      buffer.writeDoubleLE(i.quantity || 0, offset + 96);
      offset += recordSize;
    }
    return buffer;
  }

  generateCompanyDAT(info) {
    const buffer = Buffer.alloc(8192);
    buffer.write('FC', 0, 'ascii');
    buffer.write((info.name || 'Company').substring(0, 50), 4096, 'ascii');
    if (info.address) buffer.write(info.address.substring(0, 50), 4150, 'ascii');
    return buffer;
  }

  generateDetailsIni(data) {
    return `[SageFlowExport]
ExportDate=${new Date().toISOString()}
ExportedBy=SageFlow Modern Unified
TotalAccounts=${data.chart_of_accounts?.length || 0}
TotalCustomers=${data.customers?.length || 0}
TotalVendors=${data.vendors?.length || 0}
`;
  }

  // ============ DIALOG HANDLERS ============
  
  async showImportDialog(mainWindow) {
    if (!dialog) {
      return { success: false, error: 'Dialog not available outside Electron' };
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Peachtree Backup (.ptb)',
      filters: [
        { name: 'Peachtree Backup', extensions: ['ptb'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths[0]) {
      return { success: false, error: 'Import cancelled' };
    }

    return this.importPTB(result.filePaths[0]);
  }

  async showExportDialog(mainWindow, data) {
    if (!dialog) {
      return { success: false, error: 'Dialog not available outside Electron' };
    }
    
    const defaultName = `SageFlow_Backup_${new Date().toISOString().split('T')[0]}.ptb`;
    
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export to Peachtree Backup (.ptb)',
      defaultPath: defaultName,
      filters: [{ name: 'Peachtree Backup', extensions: ['ptb'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    return this.exportPTB(data, result.filePath);
  }
}

module.exports = { PTBServiceUnified };
