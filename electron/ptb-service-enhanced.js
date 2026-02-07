/**
 * Enhanced PTB (Peachtree Backup) Service for SageFlow Electron
 * 
 * IMPROVED VERSION: Uses multiple strategies to extract account balances:
 * 1. Record structure analysis (fixed-length records)
 * 2. Binary pattern matching for amounts
 * 3. Account number proximity search
 * 4. Double value scanning with validation
 */

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class EnhancedPTBService {
  constructor() {
    this.tempDir = null;
    this.debugMode = false;
  }

  /**
   * Enable debug mode to log extraction details
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  log(message) {
    if (this.debugMode) {
      console.log(`[PTB Enhanced] ${message}`);
    }
  }

  /**
   * Extract readable strings from binary data (Btrieve)
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
   * Infer account type from Peachtree account number ranges
   */
  inferAccountType(accountNumber) {
    try {
      const num = parseInt(accountNumber.replace(/[.\-]/g, '').substring(0, 4), 10);
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

  /**
   * STRATEGY 1: Parse CHARTAR.DAT using record structure analysis
   * CHARTAR.DAT contains the actual GL account records with balances
   */
  parseChartarRecords(buffer) {
    const accounts = new Map();
    
    // Peachtree CHARTAR.DAT record structure (Version 2018):
    // Each record is approximately 256-512 bytes
    // Account number is usually in first 15 bytes (null-padded)
    // Account name follows at offset ~16-66
    // Balance is stored as double at offset ~180-220 (varies by version)
    
    // Find record boundaries by looking for pattern: 0x04 0x00 followed by account number
    const accountPattern = /^\d{4,6}(\.\d+)?$/;
    
    // First pass: Find all potential account number positions
    const accountPositions = [];
    
    for (let i = 0; i < buffer.length - 200; i++) {
      // Look for Btrieve record markers
      if (buffer[i] === 0x04 && buffer[i + 1] === 0x00) {
        // Check if followed by account number (ASCII digits)
        const potentialAcct = [];
        for (let j = 2; j < 10; j++) {
          const c = buffer[i + j];
          if (c >= 0x30 && c <= 0x39) { // ASCII 0-9
            potentialAcct.push(String.fromCharCode(c));
          } else if (c === 0x2E) { // ASCII .
            potentialAcct.push('.');
          } else {
            break;
          }
        }
        
        if (potentialAcct.length >= 4) {
          const acctNum = potentialAcct.join('');
          if (accountPattern.test(acctNum)) {
            accountPositions.push({ offset: i, accountNumber: acctNum });
          }
        }
      }
    }

    this.log(`Found ${accountPositions.length} potential account positions`);

    // Second pass: Extract account details and find balances
    for (let idx = 0; idx < accountPositions.length; idx++) {
      const pos = accountPositions[idx];
      const nextPos = accountPositions[idx + 1]?.offset || buffer.length;
      const recordEnd = Math.min(pos.offset + 512, nextPos); // Max 512 bytes per record
      
      const recordBuffer = buffer.subarray(pos.offset, recordEnd);
      
      // Extract account name (usually starts after account number)
      let accountName = '';
      const recordStrings = this.extractStrings(recordBuffer, 3, 50);
      
      for (const s of recordStrings) {
        if (s.offset > 10 && /[A-Za-z]{2,}/.test(s.text) && !accountPattern.test(s.text)) {
          accountName = s.text.trim();
          break;
        }
      }

      // Find balance using multiple strategies
      let balance = 0;
      
      // Strategy A: Scan for double values at common offsets
      const commonBalanceOffsets = [64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176, 184, 192, 200];
      
      for (const offset of commonBalanceOffsets) {
        if (offset + 8 <= recordBuffer.length) {
          try {
            const val = recordBuffer.readDoubleLE(offset);
            if (this.isValidBalance(val)) {
              balance = Math.round(val * 100) / 100;
              this.log(`Account ${pos.accountNumber}: Found balance ${balance} at offset ${offset}`);
              break;
            }
          } catch {
            // Skip
          }
        }
      }

      // Strategy B: If no balance found, scan entire record for valid doubles
      if (balance === 0) {
        for (let offset = 50; offset < recordBuffer.length - 8; offset += 2) {
          try {
            const val = recordBuffer.readDoubleLE(offset);
            if (this.isValidBalance(val) && Math.abs(val) >= 1) {
              // Additional validation: Check if followed by zeros or another valid value
              const nextVal = offset + 8 < recordBuffer.length - 8 
                ? recordBuffer.readDoubleLE(offset + 8) : 0;
              
              if (nextVal === 0 || this.isValidBalance(nextVal)) {
                balance = Math.round(val * 100) / 100;
                this.log(`Account ${pos.accountNumber}: Found balance ${balance} at scan offset ${offset}`);
                break;
              }
            }
          } catch {
            // Skip
          }
        }
      }

      if (accountName && !accounts.has(pos.accountNumber)) {
        accounts.set(pos.accountNumber, {
          account_number: pos.accountNumber,
          account_name: accountName,
          type: this.inferAccountType(pos.accountNumber),
          balance: balance
        });
      }
    }

    return Array.from(accounts.values());
  }

  /**
   * Check if a value is a valid monetary balance
   */
  isValidBalance(val) {
    if (!Number.isFinite(val)) return false;
    if (val === 0) return false;
    if (Math.abs(val) < 0.01) return false;
    if (Math.abs(val) > 1e12) return false;
    
    // Additional checks for common garbage values
    if (Math.abs(val) < 1e-10 && val !== 0) return false;
    
    return true;
  }


  /**
   * STRATEGY 2: Parse using Year-End Balance records (GLBALANCE structure)
   * Some versions store cumulative balances separately
   */
  parseBalanceRecords(buffer) {
    const balances = new Map();
    
    // Peachtree stores year-end balances with specific markers
    // Pattern: ff ff ff ff ff ff followed by balance data
    
    for (let i = 0; i < buffer.length - 30; i++) {
      // Look for balance marker pattern
      if (buffer[i] === 0xff && buffer[i+1] === 0xff && 
          buffer[i+2] === 0xff && buffer[i+3] === 0xff) {
        
        // Try to find associated account number before this position
        let accountNum = '';
        for (let j = Math.max(0, i - 50); j < i; j++) {
          const potentialAcct = [];
          for (let k = 0; k < 8; k++) {
            const c = buffer[j + k];
            if (c >= 0x30 && c <= 0x39) {
              potentialAcct.push(String.fromCharCode(c));
            } else if (c === 0x2E) {
              potentialAcct.push('.');
            } else {
              break;
            }
          }
          if (potentialAcct.length >= 4) {
            accountNum = potentialAcct.join('');
            break;
          }
        }
        
        // Read balance value after marker
        if (accountNum && i + 12 < buffer.length) {
          try {
            const val = buffer.readDoubleLE(i + 8);
            if (this.isValidBalance(val)) {
              balances.set(accountNum, Math.round(val * 100) / 100);
            }
          } catch {
            // Skip
          }
        }
      }
    }
    
    return balances;
  }

  /**
   * STRATEGY 3: Correlation-based balance extraction
   * Uses known account-balance pairs to find the correct offset pattern
   */
  findBalanceOffsetPattern(buffer, knownAccounts) {
    // If we have pre-existing accounts with known balances, use them to find the pattern
    const offsets = [];
    
    for (const [acctNum, expectedBalance] of Object.entries(knownAccounts)) {
      // Find this account number in the buffer
      const acctBytes = Buffer.from(acctNum);
      const idx = buffer.indexOf(acctBytes);
      
      if (idx >= 0) {
        // Scan for the expected balance within 200 bytes
        for (let offset = 0; offset < 200; offset += 2) {
          if (idx + offset + 8 > buffer.length) break;
          
          try {
            const val = buffer.readDoubleLE(idx + offset);
            if (Math.abs(val - expectedBalance) < 0.01) {
              offsets.push(offset);
              break;
            }
          } catch {
            // Skip
          }
        }
      }
    }
    
    // Find most common offset
    if (offsets.length > 0) {
      const counts = {};
      offsets.forEach(o => { counts[o] = (counts[o] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return parseInt(sorted[0][0]);
    }
    
    return null;
  }

  /**
   * Parse Chart of Accounts from CHART.DAT (basic structure)
   */
  parseChartOfAccounts(buffer) {
    const accounts = new Map();
    const accountPattern = /^(\d{4,6}(?:\.\d+)?)$/;
    
    const strings = this.extractStrings(buffer, 3, 50);
    
    for (let i = 0; i < strings.length - 1; i++) {
      const s = strings[i].text;
      if (accountPattern.test(s)) {
        for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
          const name = strings[j].text;
          if (/[A-Za-z]{2,}/.test(name) && !accountPattern.test(name)) {
            if (!accounts.has(s)) {
              accounts.set(s, {
                account_number: s,
                account_name: name.trim(),
                type: this.inferAccountType(s),
                balance: 0
              });
            }
            break;
          }
        }
      }
    }

    return Array.from(accounts.values());
  }

  /**
   * MASTER EXTRACTION: Combines all strategies
   */
  extractAccountsWithBalances(chartBuffer, chartarBuffer, yearendBuffer = null) {
    // Start with CHART.DAT for account structure
    const chartAccounts = this.parseChartOfAccounts(chartBuffer);
    const accountsMap = new Map(chartAccounts.map(a => [a.account_number, a]));
    
    this.log(`Extracted ${chartAccounts.length} accounts from CHART.DAT`);
    
    // Use CHARTAR.DAT for balances (primary source)
    if (chartarBuffer) {
      const chartarAccounts = this.parseChartarRecords(chartarBuffer);
      
      this.log(`Extracted ${chartarAccounts.length} accounts from CHARTAR.DAT`);
      
      let updatedCount = 0;
      for (const ca of chartarAccounts) {
        if (accountsMap.has(ca.account_number)) {
          const existing = accountsMap.get(ca.account_number);
          if (ca.balance !== 0 && existing.balance === 0) {
            existing.balance = ca.balance;
            updatedCount++;
          }
        } else {
          accountsMap.set(ca.account_number, ca);
        }
      }
      
      this.log(`Updated ${updatedCount} account balances from CHARTAR`);
    }
    
    // Try additional balance sources
    if (chartarBuffer) {
      const additionalBalances = this.parseBalanceRecords(chartarBuffer);
      
      for (const [acctNum, balance] of additionalBalances) {
        const acct = accountsMap.get(acctNum);
        if (acct && acct.balance === 0 && balance !== 0) {
          acct.balance = balance;
        }
      }
    }
    
    return Array.from(accountsMap.values());
  }

  /**
   * Parse customers from CUSTOMER.DAT
   */
  parseCustomers(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['AirborneQ', 'DupF', 'Fv1b', 'Customer', 'customer', '.DAT'];
    
    const seen = new Set();
    const customers = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z]/.test(clean)) continue;
      if (clean.length < 4) continue;
      
      if (!seen.has(lower)) {
        seen.add(lower);
        customers.push({ name: clean, offset: item.offset });
      }
    }

    return customers.slice(0, 200);
  }

  /**
   * Parse vendors from VENDOR.DAT
   */
  parseVendors(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['AirborneQ', 'Vendor', 'vendor', 'Supplies', '.DAT', 'Employee', 'Payment'];
    
    const seen = new Set();
    const vendors = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z]/.test(clean)) continue;
      if (clean.length < 4) continue;
      
      if (!seen.has(lower)) {
        seen.add(lower);
        vendors.push({ name: clean });
      }
    }

    return vendors.slice(0, 200);
  }

  /**
   * Parse employees from EMPLOYEE.DAT
   */
  parseEmployees(buffer) {
    const strings = this.extractStrings(buffer, 4, 40);
    const junkPatterns = ['Employee', 'Hourly', 'Salary', 'S.S.', '.DAT'];
    
    const seen = new Set();
    const employees = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z][a-z]+/.test(clean)) continue;
      if (clean.length < 4) continue;
      
      if (!seen.has(lower)) {
        seen.add(lower);
        const parts = clean.split(/\s+/);
        employees.push({
          first_name: parts[0] || clean,
          last_name: parts.slice(1).join(' ') || ''
        });
      }
    }

    return employees.slice(0, 100);
  }

  /**
   * Parse inventory from LINEITEM.DAT or INVENTORY.DAT
   */
  parseInventory(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['Item', 'Stock', 'Description', 'GL Account', '.DAT'];
    
    const seen = new Set();
    const items = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z0-9]/.test(clean)) continue;
      if (clean.length < 4) continue;
      
      if (!seen.has(lower)) {
        seen.add(lower);
        items.push({ name: clean, description: clean });
      }
    }

    return items.slice(0, 200);
  }


  /**
   * Main Import function - Extract all data from PTB file
   */
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
      stats: {}
    };

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }

      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      
      console.log(`[PTB Enhanced] Processing ${entries.length} files from ${path.basename(filePath)}`);
      result.stats.totalFiles = entries.length;

      // Find files (case-insensitive)
      const findFile = (patterns) => {
        return entries.find(e => 
          patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase()))
        );
      };

      // Parse Chart of Accounts WITH Balances using enhanced extraction
      const chartEntry = findFile(['CHART.DAT']);
      const chartarEntry = findFile(['CHARTAR.DAT']);
      
      if (chartEntry) {
        const chartBuffer = chartEntry.getData();
        const chartarBuffer = chartarEntry ? chartarEntry.getData() : null;
        
        // Use the enhanced extraction
        result.data.chart_of_accounts = this.extractAccountsWithBalances(
          chartBuffer, 
          chartarBuffer
        );
        
        console.log(`  [Chart] Extracted ${result.data.chart_of_accounts.length} accounts`);
        
        // Count accounts with balances
        const withBalances = result.data.chart_of_accounts.filter(a => a.balance !== 0).length;
        console.log(`  [Chart] ${withBalances} accounts have non-zero balances`);
        result.stats.accountsWithBalances = withBalances;
      }

      // Parse Customers
      const custEntry = findFile(['CUSTOMER.DAT', 'CUST.DAT']);
      if (custEntry) {
        const buffer = custEntry.getData();
        result.data.customers = this.parseCustomers(buffer);
        console.log(`  [Customers] Extracted ${result.data.customers.length} customers`);
      }

      // Parse Vendors
      const vendEntry = findFile(['VENDOR.DAT']);
      if (vendEntry) {
        const buffer = vendEntry.getData();
        result.data.vendors = this.parseVendors(buffer);
        console.log(`  [Vendors] Extracted ${result.data.vendors.length} vendors`);
      }

      // Parse Employees
      const empEntry = findFile(['EMPLOYEE.DAT', 'EMP.DAT']);
      if (empEntry) {
        const buffer = empEntry.getData();
        result.data.employees = this.parseEmployees(buffer);
        console.log(`  [Employees] Extracted ${result.data.employees.length} employees`);
      }

      // Parse Inventory
      const invEntry = findFile(['LINEITEM.DAT', 'INVENTORY.DAT', 'ITEM.DAT']);
      if (invEntry) {
        const buffer = invEntry.getData();
        result.data.inventory = this.parseInventory(buffer);
        console.log(`  [Inventory] Extracted ${result.data.inventory.length} items`);
      }

      // Parse Company Info
      const companyEntry = findFile(['COMPANY.DAT', 'CMPY.DAT']);
      if (companyEntry) {
        const buffer = companyEntry.getData();
        const strings = this.extractStrings(buffer, 5, 100);
        if (strings.length > 0) {
          result.data.company_info = {
            name: strings[0].text,
            additional: strings.slice(1, 5).map(s => s.text)
          };
        }
      }

      // Calculate totals
      result.stats.totalAccounts = result.data.chart_of_accounts.length;
      result.stats.totalCustomers = result.data.customers.length;
      result.stats.totalVendors = result.data.vendors.length;
      result.stats.totalEmployees = result.data.employees.length;
      result.stats.totalInventory = result.data.inventory.length;
      
      // Calculate balance totals by type
      result.stats.balanceSummary = {
        assets: 0,
        liabilities: 0,
        equity: 0,
        revenue: 0,
        expenses: 0
      };
      
      for (const acct of result.data.chart_of_accounts) {
        const balance = acct.balance || 0;
        if (acct.type === 'ASSET') result.stats.balanceSummary.assets += balance;
        else if (acct.type === 'LIABILITY') result.stats.balanceSummary.liabilities += balance;
        else if (acct.type === 'EQUITY') result.stats.balanceSummary.equity += balance;
        else if (acct.type === 'REVENUE') result.stats.balanceSummary.revenue += balance;
        else if (acct.type === 'EXPENSE') result.stats.balanceSummary.expenses += balance;
      }

      result.success = true;
      console.log(`[PTB Enhanced] Import complete!`);
      console.log(`  Total Assets: ${result.stats.balanceSummary.assets.toLocaleString()}`);
      console.log(`  Total Liabilities: ${result.stats.balanceSummary.liabilities.toLocaleString()}`);
      console.log(`  Total Equity: ${result.stats.balanceSummary.equity.toLocaleString()}`);

    } catch (error) {
      result.error = error.message;
      console.error('[PTB Enhanced] Import failed:', error);
    }

    return result;
  }

  /**
   * Show file dialog and import PTB
   */
  async showImportDialog(mainWindow) {
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

  /**
   * Export data to PTB format
   */
  async exportPTB(data, outputPath) {
    try {
      const zip = new AdmZip();
      
      // Generate CHART.DAT
      if (data.chart_of_accounts && data.chart_of_accounts.length > 0) {
        const chartBuffer = this.generateChartDAT(data.chart_of_accounts);
        zip.addFile('CHART.DAT', chartBuffer);
        
        const chartarBuffer = this.generateChartarDAT(data.chart_of_accounts);
        zip.addFile('CHARTAR.DAT', chartarBuffer);
      }

      // Generate CUSTOMER.DAT
      if (data.customers && data.customers.length > 0) {
        const custBuffer = this.generateCustomerDAT(data.customers);
        zip.addFile('CUSTOMER.DAT', custBuffer);
      }

      // Generate VENDOR.DAT
      if (data.vendors && data.vendors.length > 0) {
        const vendBuffer = this.generateVendorDAT(data.vendors);
        zip.addFile('VENDOR.DAT', vendBuffer);
      }

      // Generate COMPANY.INI
      const metadata = this.generateCompanyINI(data);
      zip.addFile('COMPANY.INI', Buffer.from(metadata));

      // Write the file
      zip.writeZip(outputPath);
      
      console.log(`[PTB Enhanced] Exported to ${outputPath}`);
      return { 
        success: true, 
        path: outputPath,
        stats: {
          accounts: data.chart_of_accounts?.length || 0,
          customers: data.customers?.length || 0,
          vendors: data.vendors?.length || 0
        }
      };

    } catch (error) {
      console.error('[PTB Enhanced] Export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate Chart of Accounts DAT file with Peachtree-compatible structure
   */
  generateChartDAT(accounts) {
    const recordSize = 128;
    const buffer = Buffer.alloc(accounts.length * recordSize);
    
    let offset = 0;
    for (const acct of accounts) {
      // Btrieve record header
      buffer.writeUInt8(0x04, offset);
      buffer.writeUInt8(0x00, offset + 1);
      
      // Account number (15 bytes, padded)
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset + 2, 'ascii');
      
      // Account name (50 bytes)
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 17, 'ascii');
      
      // Account type (1 byte)
      let typeCode = 1;
      switch (acct.type) {
        case 'ASSET': typeCode = 1; break;
        case 'LIABILITY': typeCode = 2; break;
        case 'EQUITY': typeCode = 3; break;
        case 'REVENUE': typeCode = 4; break;
        case 'EXPENSE': typeCode = 5; break;
      }
      buffer.writeUInt8(typeCode, offset + 67);
      
      // Balance (8 bytes double) at offset 80
      buffer.writeDoubleLE(acct.balance || 0, offset + 80);
      
      offset += recordSize;
    }

    return buffer;
  }

  /**
   * Generate CHARTAR.DAT with full account records and balances
   */
  generateChartarDAT(accounts) {
    const recordSize = 256;
    const buffer = Buffer.alloc(accounts.length * recordSize);
    
    let offset = 0;
    for (const acct of accounts) {
      // Record header
      buffer.writeUInt8(0x04, offset);
      buffer.writeUInt8(0x00, offset + 1);
      
      // Account number (15 bytes)
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset + 2, 'ascii');
      
      // Account name (50 bytes)
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 17, 'ascii');
      
      // Type code (4 bytes)
      let typeCode = 1;
      switch (acct.type) {
        case 'ASSET': typeCode = 1; break;
        case 'LIABILITY': typeCode = 2; break;
        case 'EQUITY': typeCode = 3; break;
        case 'REVENUE': typeCode = 4; break;
        case 'EXPENSE': typeCode = 5; break;
      }
      buffer.writeInt32LE(typeCode, offset + 67);
      
      // Balance marker pattern
      buffer.writeUInt8(0xff, offset + 72);
      buffer.writeUInt8(0xff, offset + 73);
      buffer.writeUInt8(0xff, offset + 74);
      buffer.writeUInt8(0xff, offset + 75);
      
      // Balance (8 bytes double)
      buffer.writeDoubleLE(acct.balance || 0, offset + 80);
      
      // Also write balance at alternate location for compatibility
      buffer.writeDoubleLE(acct.balance || 0, offset + 96);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateCustomerDAT(customers) {
    const recordSize = 256;
    const buffer = Buffer.alloc(customers.length * recordSize);
    
    let offset = 0;
    for (let i = 0; i < customers.length; i++) {
      const cust = customers[i];
      
      // Record header
      buffer.writeUInt8(0x04, offset);
      buffer.writeUInt8(0x00, offset + 1);
      
      // Customer ID (20 bytes)
      const idStr = (cust.id || cust.customer_id || `CUST-${String(i + 1).padStart(4, '0')}`).substring(0, 20).padEnd(20, '\0');
      buffer.write(idStr, offset + 2, 'ascii');
      
      // Name (50 bytes)
      const nameStr = (cust.name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 22, 'ascii');
      
      // Contact (30 bytes)
      const contactStr = (cust.contact || '').substring(0, 30).padEnd(30, '\0');
      buffer.write(contactStr, offset + 72, 'ascii');
      
      // Phone (20 bytes)
      const phoneStr = (cust.phone || '').substring(0, 20).padEnd(20, '\0');
      buffer.write(phoneStr, offset + 102, 'ascii');
      
      // Balance (8 bytes)
      buffer.writeDoubleLE(cust.balance || 0, offset + 130);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateVendorDAT(vendors) {
    const recordSize = 256;
    const buffer = Buffer.alloc(vendors.length * recordSize);
    
    let offset = 0;
    for (let i = 0; i < vendors.length; i++) {
      const vend = vendors[i];
      
      // Record header
      buffer.writeUInt8(0x04, offset);
      buffer.writeUInt8(0x00, offset + 1);
      
      // Vendor ID (20 bytes)
      const idStr = (vend.id || vend.vendor_id || `VEND-${String(i + 1).padStart(4, '0')}`).substring(0, 20).padEnd(20, '\0');
      buffer.write(idStr, offset + 2, 'ascii');
      
      // Name (50 bytes)
      const nameStr = (vend.name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 22, 'ascii');
      
      // Contact (30 bytes)
      const contactStr = (vend.contact || '').substring(0, 30).padEnd(30, '\0');
      buffer.write(contactStr, offset + 72, 'ascii');
      
      // Phone (20 bytes)
      const phoneStr = (vend.phone || '').substring(0, 20).padEnd(20, '\0');
      buffer.write(phoneStr, offset + 102, 'ascii');
      
      // Balance (8 bytes)
      buffer.writeDoubleLE(vend.balance || 0, offset + 130);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateCompanyINI(data) {
    const now = new Date().toISOString();
    return `[Company]
Name=${data.company_info?.name || 'SageFlow Export'}
ExportDate=${now}
ExportedBy=SageFlow Modern (Enhanced PTB Service)

[Statistics]
Accounts=${data.chart_of_accounts?.length || 0}
Customers=${data.customers?.length || 0}
Vendors=${data.vendors?.length || 0}
Employees=${data.employees?.length || 0}
Inventory=${data.inventory?.length || 0}

[BalanceSummary]
TotalAssets=${data.chart_of_accounts?.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + (a.balance || 0), 0) || 0}
TotalLiabilities=${data.chart_of_accounts?.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + (a.balance || 0), 0) || 0}
TotalEquity=${data.chart_of_accounts?.filter(a => a.type === 'EQUITY').reduce((sum, a) => sum + (a.balance || 0), 0) || 0}
TotalRevenue=${data.chart_of_accounts?.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + (a.balance || 0), 0) || 0}
TotalExpenses=${data.chart_of_accounts?.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + (a.balance || 0), 0) || 0}

[SageFlow]
Version=1.0.0
Format=PTB_ENHANCED
`;
  }

  /**
   * Show save dialog and export to PTB
   */
  async showExportDialog(mainWindow, data) {
    const defaultName = `SageFlow_Backup_${new Date().toISOString().split('T')[0]}.ptb`;
    
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export to Peachtree Backup (.ptb)',
      defaultPath: defaultName,
      filters: [
        { name: 'Peachtree Backup', extensions: ['ptb'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    return this.exportPTB(data, result.filePath);
  }
}

module.exports = { EnhancedPTBService };
