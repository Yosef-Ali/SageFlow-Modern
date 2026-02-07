/**
 * PTB (Peachtree Backup) Service for SageFlow Electron
 * 
 * Handles import/export of Peachtree .ptb backup files
 * PTB files are ZIP archives containing Btrieve .DAT files
 * 
 * IMPROVED VERSION: Better balance extraction and account matching
 */

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class PTBService {
  constructor() {
    this.tempDir = null;
  }

  /**
   * Extract readable strings from binary data (Btrieve)
   */
  extractStrings(buffer, minLen = 4, maxLen = 60) {
    const strings = [];
    let current = [];

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if (byte >= 32 && byte < 127) { // Printable ASCII
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
   * Parse CHARTAR.DAT (Account Records with Balances)
   * This file contains the actual account data with balances
   */
  parseChartarFile(buffer) {
    const accounts = new Map();
    
    // CHARTAR.DAT uses fixed-length records
    // Record structure (approximate - Peachtree varies by version):
    // - Account Number: 15 bytes (null-padded string)
    // - Account Name: 30-50 bytes
    // - Account Type: 1-4 bytes
    // - Balance: 8 bytes (double)
    
    // Strategy: Find account number patterns and nearby doubles for balances
    const accountPattern = /^\d{4,6}(\.\d+)?$/;
    const strings = this.extractStrings(buffer, 3, 60);
    
    for (let i = 0; i < strings.length - 1; i++) {
      const s = strings[i].text;
      const offset = strings[i].offset;
      
      if (accountPattern.test(s)) {
        // Look for name in next few strings
        let name = null;
        for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
          const potentialName = strings[j].text;
          // Name should have letters and not be just numbers
          if (/[A-Za-z]{2,}/.test(potentialName) && !accountPattern.test(potentialName)) {
            name = potentialName.trim();
            break;
          }
        }
        
        // Look for balance (double) within ~100 bytes after account number
        let balance = 0;
        for (let k = offset; k < Math.min(offset + 100, buffer.length - 8); k++) {
          try {
            const val = buffer.readDoubleLE(k);
            // Check if it's a reasonable monetary value
            if (val === val && Math.abs(val) > 0.01 && Math.abs(val) < 1e12 && val !== 0) {
              // Additional check: the value should be followed by zeros or valid data
              const next = buffer.readDoubleLE(k + 8);
              if (next === 0 || (Math.abs(next) > 0.01 && Math.abs(next) < 1e12)) {
                balance = Math.round(val * 100) / 100;
                break;
              }
            }
          } catch {
            // Skip invalid reads
          }
        }
        
        if (name && !accounts.has(s)) {
          accounts.set(s, {
            account_number: s,
            account_name: name,
            type: this.inferAccountType(s),
            balance: balance
          });
        }
      }
    }

    return Array.from(accounts.values());
  }

  /**
   * Parse Chart of Accounts from CHART.DAT
   */
  parseChartOfAccounts(buffer) {
    const accounts = new Map();
    const accountPattern = /^(\d{4,6}(?:\.\d+)?)$/;
    
    const strings = this.extractStrings(buffer, 3, 50);
    
    // Find account numbers and pair with nearby names
    for (let i = 0; i < strings.length - 1; i++) {
      const s = strings[i].text;
      if (accountPattern.test(s)) {
        // Look for name in next few strings
        for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
          const name = strings[j].text;
          // Name should have letters and not be just numbers
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
   * Parse balance records and link to accounts
   * Searches for balance patterns in CHARTAR.DAT
   */
  parseBalancesWithAccounts(chartBuffer, chartarBuffer) {
    const accounts = this.parseChartOfAccounts(chartBuffer);
    const accountsMap = new Map(accounts.map(a => [a.account_number, a]));
    
    if (chartarBuffer) {
      // CHARTAR.DAT contains account records with balances
      const chartarAccounts = this.parseChartarFile(chartarBuffer);
      
      // Merge balances into existing accounts
      for (const ca of chartarAccounts) {
        if (accountsMap.has(ca.account_number)) {
          const existing = accountsMap.get(ca.account_number);
          existing.balance = ca.balance;
        } else {
          accountsMap.set(ca.account_number, ca);
        }
      }
    }
    
    // Also try to extract balances from pattern matching
    if (chartarBuffer) {
      this.extractBalancesByPattern(chartarBuffer, accountsMap);
    }
    
    return Array.from(accountsMap.values());
  }

  /**
   * Extract balances using known Peachtree binary patterns
   */
  extractBalancesByPattern(buffer, accountsMap) {
    // Peachtree stores balances in specific patterns
    // Pattern 1: Account number (4 bytes) followed by type byte then double
    // Pattern 2: Account ID in record header, balance at fixed offset
    
    const accountNumbers = Array.from(accountsMap.keys()).sort((a, b) => a.localeCompare(b));
    
    for (const acctNum of accountNumbers) {
      const acctBytes = Buffer.from(acctNum.padEnd(15, '\0'));
      
      // Search for this account number in the buffer
      let searchStart = 0;
      while (searchStart < buffer.length - 100) {
        const idx = buffer.indexOf(acctBytes.slice(0, 4), searchStart);
        if (idx === -1) break;
        
        // Look for double value within next 50 bytes
        for (let offset = 10; offset < 60; offset++) {
          try {
            const val = buffer.readDoubleLE(idx + offset);
            if (val === val && Math.abs(val) >= 0.01 && Math.abs(val) < 1e10) {
              const account = accountsMap.get(acctNum);
              if (account && account.balance === 0) {
                account.balance = Math.round(val * 100) / 100;
              }
              break;
            }
          } catch {
            // Skip
          }
        }
        
        searchStart = idx + 1;
      }
    }
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
        customers.push({ name: clean });
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
   * Import PTB file and extract all data
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
      
      console.log(`[PTB Service] Processing ${entries.length} files from ${path.basename(filePath)}`);
      result.stats.totalFiles = entries.length;

      // Find files (case-insensitive)
      const findFile = (patterns) => {
        return entries.find(e => 
          patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase()))
        );
      };

      // Parse Chart of Accounts WITH Balances
      const chartEntry = findFile(['CHART.DAT']);
      const chartarEntry = findFile(['CHARTAR.DAT']);
      
      if (chartEntry) {
        const chartBuffer = chartEntry.getData();
        const chartarBuffer = chartarEntry ? chartarEntry.getData() : null;
        
        result.data.chart_of_accounts = this.parseBalancesWithAccounts(chartBuffer, chartarBuffer);
        console.log(`  [Chart] Extracted ${result.data.chart_of_accounts.length} accounts`);
        
        // Count accounts with balances
        const withBalances = result.data.chart_of_accounts.filter(a => a.balance !== 0).length;
        console.log(`  [Chart] ${withBalances} accounts have balances`);
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
        if (acct.type === 'ASSET') result.stats.balanceSummary.assets += acct.balance;
        else if (acct.type === 'LIABILITY') result.stats.balanceSummary.liabilities += acct.balance;
        else if (acct.type === 'EQUITY') result.stats.balanceSummary.equity += acct.balance;
        else if (acct.type === 'REVENUE') result.stats.balanceSummary.revenue += acct.balance;
        else if (acct.type === 'EXPENSE') result.stats.balanceSummary.expenses += acct.balance;
      }

      result.success = true;
      console.log(`[PTB Service] Import complete!`);

    } catch (error) {
      result.error = error.message;
      console.error('[PTB Service] Import failed:', error);
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
   * Creates a ZIP file with .DAT files compatible with Peachtree
   */
  async exportPTB(data, outputPath) {
    try {
      const zip = new AdmZip();
      
      // Generate CHART.DAT with balances
      if (data.chart_of_accounts && data.chart_of_accounts.length > 0) {
        const chartBuffer = this.generateChartDAT(data.chart_of_accounts);
        zip.addFile('CHART.DAT', chartBuffer);
        
        // Also generate CHARTAR.DAT for balances
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

      // Generate COMPANY.INI with metadata
      const metadata = this.generateCompanyINI(data);
      zip.addFile('COMPANY.INI', Buffer.from(metadata));

      // Write the file
      zip.writeZip(outputPath);
      
      console.log(`[PTB Service] Exported to ${outputPath}`);
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
      console.error('[PTB Service] Export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate Chart of Accounts DAT file
   */
  generateChartDAT(accounts) {
    const recordSize = 100; // Fixed record size
    const buffer = Buffer.alloc(accounts.length * recordSize);
    
    let offset = 0;
    for (const acct of accounts) {
      // Account number (15 bytes)
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset, 'ascii');
      
      // Account name (50 bytes)
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 15, 'ascii');
      
      // Account type (1 byte)
      let typeCode = 0;
      switch (acct.type) {
        case 'ASSET': typeCode = 1; break;
        case 'LIABILITY': typeCode = 2; break;
        case 'EQUITY': typeCode = 3; break;
        case 'REVENUE': typeCode = 4; break;
        case 'EXPENSE': typeCode = 5; break;
      }
      buffer.writeUInt8(typeCode, offset + 65);
      
      // Balance (8 bytes double)
      buffer.writeDoubleLE(acct.balance || 0, offset + 66);
      
      offset += recordSize;
    }

    return buffer;
  }

  /**
   * Generate CHARTAR.DAT with full account records and balances
   */
  generateChartarDAT(accounts) {
    const recordSize = 150; // Larger record for balances
    const buffer = Buffer.alloc(accounts.length * recordSize);
    
    let offset = 0;
    for (const acct of accounts) {
      // Account number (15 bytes)
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset, 'ascii');
      
      // Account name (50 bytes)
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 15, 'ascii');
      
      // Type code (4 bytes)
      let typeCode = 0;
      switch (acct.type) {
        case 'ASSET': typeCode = 1; break;
        case 'LIABILITY': typeCode = 2; break;
        case 'EQUITY': typeCode = 3; break;
        case 'REVENUE': typeCode = 4; break;
        case 'EXPENSE': typeCode = 5; break;
      }
      buffer.writeInt32LE(typeCode, offset + 65);
      
      // Balance marker pattern (Peachtree uses ff ff ff ff ff ff 11 00)
      buffer.writeUInt8(0xff, offset + 70);
      buffer.writeUInt8(0xff, offset + 71);
      buffer.writeUInt8(0xff, offset + 72);
      buffer.writeUInt8(0xff, offset + 73);
      buffer.writeUInt8(0xff, offset + 74);
      buffer.writeUInt8(0xff, offset + 75);
      buffer.writeUInt8(0x11, offset + 76);
      buffer.writeUInt8(0x00, offset + 77);
      
      // Balance (8 bytes double)
      buffer.writeDoubleLE(acct.balance || 0, offset + 78);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateCustomerDAT(customers) {
    const recordSize = 200;
    const buffer = Buffer.alloc(customers.length * recordSize);
    
    let offset = 0;
    for (const cust of customers) {
      // Customer ID (20 bytes)
      const idStr = (cust.id || cust.customer_id || `CUST-${offset}`).substring(0, 20).padEnd(20, '\0');
      buffer.write(idStr, offset, 'ascii');
      
      // Name (50 bytes)
      const nameStr = (cust.name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 20, 'ascii');
      
      // Contact (30 bytes)
      const contactStr = (cust.contact || '').substring(0, 30).padEnd(30, '\0');
      buffer.write(contactStr, offset + 70, 'ascii');
      
      // Phone (20 bytes)
      const phoneStr = (cust.phone || '').substring(0, 20).padEnd(20, '\0');
      buffer.write(phoneStr, offset + 100, 'ascii');
      
      // Balance (8 bytes)
      buffer.writeDoubleLE(cust.balance || 0, offset + 120);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateVendorDAT(vendors) {
    const recordSize = 200;
    const buffer = Buffer.alloc(vendors.length * recordSize);
    
    let offset = 0;
    for (const vend of vendors) {
      // Vendor ID (20 bytes)
      const idStr = (vend.id || vend.vendor_id || `VEND-${offset}`).substring(0, 20).padEnd(20, '\0');
      buffer.write(idStr, offset, 'ascii');
      
      // Name (50 bytes)
      const nameStr = (vend.name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 20, 'ascii');
      
      // Contact (30 bytes)
      const contactStr = (vend.contact || '').substring(0, 30).padEnd(30, '\0');
      buffer.write(contactStr, offset + 70, 'ascii');
      
      // Phone (20 bytes)
      const phoneStr = (vend.phone || '').substring(0, 20).padEnd(20, '\0');
      buffer.write(phoneStr, offset + 100, 'ascii');
      
      // Balance (8 bytes)
      buffer.writeDoubleLE(vend.balance || 0, offset + 120);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateCompanyINI(data) {
    const now = new Date().toISOString();
    return `[Company]
Name=${data.company_info?.name || 'SageFlow Export'}
ExportDate=${now}
ExportedBy=SageFlow Modern

[Statistics]
Accounts=${data.chart_of_accounts?.length || 0}
Customers=${data.customers?.length || 0}
Vendors=${data.vendors?.length || 0}
Employees=${data.employees?.length || 0}
Inventory=${data.inventory?.length || 0}

[SageFlow]
Version=1.0.0
Format=PTB_COMPATIBLE
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

module.exports = { PTBService };
