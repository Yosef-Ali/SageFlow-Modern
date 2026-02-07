/**
 * PTB Service v3 - Complete Peachtree Backup Import/Export
 * 
 * STRATEGY: 
 * 1. Extract accounts from CHART.DAT (names and structure)
 * 2. Calculate balances from JRNLROW.DAT (journal entries - most reliable)
 * 3. Cross-reference with CHARTAR.DAT and PERIODAR.DAT
 * 4. Full export with compatible structure
 */

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class PTBServiceV3 {
  constructor() {
    this.debugMode = true;
  }

  log(message) {
    if (this.debugMode) {
      console.log(`[PTB-v3] ${message}`);
    }
  }

  // ============ STRING EXTRACTION ============
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

  // ============ ACCOUNT TYPE INFERENCE ============
  inferAccountType(accountNumber) {
    try {
      const numStr = accountNumber.replace(/[.\-]/g, '');
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

  // ============ PARSE CHART.DAT ============
  parseChartDAT(buffer) {
    const accounts = new Map();
    const accountPattern = /^(\d{4,6}(?:\.\d+)?)$/;
    
    const strings = this.extractStrings(buffer, 3, 50);
    
    for (let i = 0; i < strings.length - 1; i++) {
      const s = strings[i].text;
      if (accountPattern.test(s)) {
        // Look for account name after account number
        for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
          const name = strings[j].text;
          if (/[A-Za-z]{2,}/.test(name) && !accountPattern.test(name)) {
            if (!accounts.has(s)) {
              accounts.set(s, {
                account_number: s,
                account_name: name.trim(),
                type: this.inferAccountType(s),
                balance: 0,
                debit_total: 0,
                credit_total: 0
              });
            }
            break;
          }
        }
      }
    }

    this.log(`Parsed ${accounts.size} accounts from CHART.DAT`);
    return accounts;
  }

  // ============ PARSE JOURNAL ENTRIES FOR BALANCES ============
  parseJournalRows(buffer, accounts) {
    // JRNLROW.DAT contains journal entry line items
    // Each record has: account number, debit amount, credit amount
    
    // Peachtree JRNLROW record structure (approximate):
    // - Record size: ~256-512 bytes
    // - Account ID: 15 bytes at various offsets
    // - Amounts: stored as doubles (8 bytes)
    
    const pageSize = 4096;
    const recordSize = 256; // Approximate record size
    
    let debits = new Map();
    let credits = new Map();
    let transactionCount = 0;
    
    // Skip header pages (usually first 8KB)
    const dataStart = pageSize * 2;
    
    // Scan for double values that look like monetary amounts
    for (let offset = dataStart; offset < buffer.length - recordSize; offset += 2) {
      // Look for account number pattern followed by amounts
      const potentialAcct = [];
      for (let j = 0; j < 10; j++) {
        const c = buffer[offset + j];
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
        if (accounts.has(acctNum)) {
          // Found a known account, scan for amounts nearby
          for (let amtOffset = 16; amtOffset < 200; amtOffset += 8) {
            if (offset + amtOffset + 16 > buffer.length) break;
            
            try {
              const val1 = buffer.readDoubleLE(offset + amtOffset);
              const val2 = buffer.readDoubleLE(offset + amtOffset + 8);
              
              // Check if these look like debit/credit pair
              if (this.isValidAmount(val1) || this.isValidAmount(val2)) {
                if (this.isValidAmount(val1) && val1 > 0) {
                  debits.set(acctNum, (debits.get(acctNum) || 0) + val1);
                  transactionCount++;
                }
                if (this.isValidAmount(val2) && val2 > 0) {
                  credits.set(acctNum, (credits.get(acctNum) || 0) + val2);
                }
                break;
              }
            } catch {}
          }
        }
      }
    }
    
    this.log(`Found ${transactionCount} journal entries`);
    
    // Update account balances
    for (const [acctNum, acct] of accounts) {
      const debitTotal = debits.get(acctNum) || 0;
      const creditTotal = credits.get(acctNum) || 0;
      
      acct.debit_total = Math.round(debitTotal * 100) / 100;
      acct.credit_total = Math.round(creditTotal * 100) / 100;
      
      // Calculate balance based on account type
      // Assets & Expenses: Debit increases, Credit decreases
      // Liabilities, Equity & Revenue: Credit increases, Debit decreases
      if (acct.type === 'ASSET' || acct.type === 'EXPENSE') {
        acct.balance = Math.round((debitTotal - creditTotal) * 100) / 100;
      } else {
        acct.balance = Math.round((creditTotal - debitTotal) * 100) / 100;
      }
    }
    
    return accounts;
  }

  isValidAmount(val) {
    if (!Number.isFinite(val)) return false;
    if (val === 0) return false;
    if (Math.abs(val) < 0.01) return false;
    if (Math.abs(val) > 1e12) return false;
    return true;
  }

  // ============ SCAN CHARTAR FOR DIRECT BALANCES ============
  parseChartarBalances(buffer, accounts) {
    // CHARTAR.DAT has the year-to-date balances
    // Scan for known account numbers and extract nearby doubles
    
    const balancesFound = new Map();
    
    for (const [acctNum, acct] of accounts) {
      // Search for this account number in the buffer
      const searchBytes = Buffer.from(acctNum);
      let searchStart = 0;
      
      while (searchStart < buffer.length) {
        const idx = buffer.indexOf(searchBytes, searchStart);
        if (idx === -1) break;
        
        // Found account number, look for balance values
        for (let offset = 40; offset < 200; offset += 8) {
          if (idx + offset + 8 > buffer.length) break;
          
          try {
            const val = buffer.readDoubleLE(idx + offset);
            if (this.isValidAmount(val)) {
              // Store the first valid value found
              if (!balancesFound.has(acctNum)) {
                balancesFound.set(acctNum, val);
              }
              break;
            }
          } catch {}
        }
        
        searchStart = idx + 1;
      }
    }
    
    this.log(`Found ${balancesFound.size} balances directly from CHARTAR`);
    
    // Update accounts with found balances if they don't have one
    for (const [acctNum, balance] of balancesFound) {
      const acct = accounts.get(acctNum);
      if (acct && acct.balance === 0) {
        acct.balance = Math.round(balance * 100) / 100;
        acct.balance_source = 'CHARTAR';
      }
    }
    
    return accounts;
  }

  // ============ PARSE CUSTOMERS ============
  parseCustomers(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['AirborneQ', 'DupF', 'Fv1b', 'Customer', '.DAT', 'CUSTOMER'];
    
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
        customers.push({ 
          name: clean, 
          customer_id: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
          balance: 0 
        });
      }
    }

    return customers.slice(0, 500);
  }

  // ============ PARSE VENDORS ============
  parseVendors(buffer) {
    const strings = this.extractStrings(buffer, 4, 50);
    const junkPatterns = ['AirborneQ', 'Vendor', 'VENDOR', 'Supplies', '.DAT'];
    
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
        vendors.push({ 
          name: clean,
          vendor_id: `VEND-${String(vendors.length + 1).padStart(4, '0')}`,
          balance: 0
        });
      }
    }

    return vendors.slice(0, 500);
  }

  // ============ PARSE COMPANY INFO ============
  parseCompanyInfo(buffer) {
    const strings = this.extractStrings(buffer, 3, 100);
    
    // Company info is usually in the first few meaningful strings
    const info = {
      name: '',
      address: '',
      city: '',
      phone: '',
      tax_id: ''
    };
    
    let infoStrings = strings
      .map(s => s.text)
      .filter(s => s.length > 2 && /[A-Za-z]/.test(s));
    
    if (infoStrings.length > 0) info.name = infoStrings[0];
    if (infoStrings.length > 1) info.address = infoStrings[1];
    if (infoStrings.length > 2) info.city = infoStrings[2];
    
    // Look for phone pattern
    const phoneMatch = strings.find(s => /\d{3}[\-\.\s]?\d{3}[\-\.\s]?\d{4}/.test(s.text));
    if (phoneMatch) info.phone = phoneMatch.text;
    
    return info;
  }

  // ============ MAIN IMPORT ============
  async importPTB(filePath) {
    const result = {
      success: false,
      data: {
        chart_of_accounts: [],
        customers: [],
        vendors: [],
        company_info: null
      },
      error: null,
      stats: {}
    };

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }

      this.log(`Opening PTB file: ${filePath}`);
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      
      this.log(`Found ${entries.length} files in PTB`);

      // Helper to find files case-insensitively
      const findFile = (patterns) => {
        return entries.find(e => 
          patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase()))
        );
      };

      // Step 1: Parse CHART.DAT for account structure
      const chartEntry = findFile(['CHART.DAT']);
      let accounts = new Map();
      
      if (chartEntry) {
        const chartBuffer = chartEntry.getData();
        accounts = this.parseChartDAT(chartBuffer);
        this.log(`Parsed ${accounts.size} accounts from CHART.DAT`);
      }

      // Step 2: Try to get balances from CHARTAR.DAT
      const chartarEntry = findFile(['CHARTAR.DAT']);
      if (chartarEntry && accounts.size > 0) {
        const chartarBuffer = chartarEntry.getData();
        accounts = this.parseChartarBalances(chartarBuffer, accounts);
      }

      // Step 3: Calculate balances from journal entries (most reliable)
      const jrnlrowEntry = findFile(['JRNLROW.DAT']);
      if (jrnlrowEntry && accounts.size > 0) {
        const jrnlBuffer = jrnlrowEntry.getData();
        accounts = this.parseJournalRows(jrnlBuffer, accounts);
      }

      // Convert accounts map to array
      result.data.chart_of_accounts = Array.from(accounts.values());

      // Step 4: Parse Customers
      const custEntry = findFile(['CUSTOMER.DAT']);
      if (custEntry) {
        const buffer = custEntry.getData();
        result.data.customers = this.parseCustomers(buffer);
        this.log(`Parsed ${result.data.customers.length} customers`);
      }

      // Step 5: Parse Vendors
      const vendEntry = findFile(['VENDOR.DAT']);
      if (vendEntry) {
        const buffer = vendEntry.getData();
        result.data.vendors = this.parseVendors(buffer);
        this.log(`Parsed ${result.data.vendors.length} vendors`);
      }

      // Step 6: Parse Company Info
      const companyEntry = findFile(['COMPANY.DAT']);
      if (companyEntry) {
        const buffer = companyEntry.getData();
        result.data.company_info = this.parseCompanyInfo(buffer);
      }

      // Calculate statistics
      const accountsWithBalance = result.data.chart_of_accounts.filter(a => a.balance !== 0);
      
      result.stats = {
        totalAccounts: result.data.chart_of_accounts.length,
        accountsWithBalances: accountsWithBalance.length,
        totalCustomers: result.data.customers.length,
        totalVendors: result.data.vendors.length,
        balanceSummary: {
          assets: result.data.chart_of_accounts
            .filter(a => a.type === 'ASSET')
            .reduce((sum, a) => sum + (a.balance || 0), 0),
          liabilities: result.data.chart_of_accounts
            .filter(a => a.type === 'LIABILITY')
            .reduce((sum, a) => sum + (a.balance || 0), 0),
          equity: result.data.chart_of_accounts
            .filter(a => a.type === 'EQUITY')
            .reduce((sum, a) => sum + (a.balance || 0), 0),
          revenue: result.data.chart_of_accounts
            .filter(a => a.type === 'REVENUE')
            .reduce((sum, a) => sum + (a.balance || 0), 0),
          expenses: result.data.chart_of_accounts
            .filter(a => a.type === 'EXPENSE')
            .reduce((sum, a) => sum + (a.balance || 0), 0)
        }
      };

      this.log(`Import complete!`);
      this.log(`  Accounts: ${result.stats.totalAccounts} (${result.stats.accountsWithBalances} with balances)`);
      this.log(`  Customers: ${result.stats.totalCustomers}`);
      this.log(`  Vendors: ${result.stats.totalVendors}`);

      result.success = true;

    } catch (error) {
      result.error = error.message;
      this.log(`Import failed: ${error.message}`);
      console.error(error);
    }

    return result;
  }

  // ============ EXPORT TO PTB ============
  async exportPTB(data, outputPath) {
    try {
      const zip = new AdmZip();
      
      // Generate CHART.DAT
      if (data.chart_of_accounts?.length > 0) {
        const chartBuffer = this.generateChartDAT(data.chart_of_accounts);
        zip.addFile('CHART.DAT', chartBuffer);
        
        const chartarBuffer = this.generateChartarDAT(data.chart_of_accounts);
        zip.addFile('CHARTAR.DAT', chartarBuffer);
      }

      // Generate CUSTOMER.DAT
      if (data.customers?.length > 0) {
        const custBuffer = this.generateCustomerDAT(data.customers);
        zip.addFile('CUSTOMER.DAT', custBuffer);
      }

      // Generate VENDOR.DAT
      if (data.vendors?.length > 0) {
        const vendBuffer = this.generateVendorDAT(data.vendors);
        zip.addFile('VENDOR.DAT', vendBuffer);
      }

      // Generate COMPANY.DAT
      const companyBuffer = this.generateCompanyDAT(data.company_info || { name: 'SageFlow Export' });
      zip.addFile('COMPANY.DAT', companyBuffer);

      // Generate VERSION.TXT
      zip.addFile('VERSION.TXT', Buffer.from('20.0.0.0'));

      // Generate Details.ini
      const detailsIni = this.generateDetailsIni(data);
      zip.addFile('Details.ini', Buffer.from(detailsIni));

      // Write the file
      zip.writeZip(outputPath);
      
      this.log(`Exported to ${outputPath}`);
      
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
      this.log(`Export failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============ GENERATE DAT FILES ============
  generateChartDAT(accounts) {
    // Btrieve file header + records
    const headerSize = 4096;
    const recordSize = 256;
    const buffer = Buffer.alloc(headerSize + accounts.length * recordSize);
    
    // Write Btrieve header signature
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2); // File type
    buffer.writeUInt32LE(accounts.length, 0x04); // Record count
    buffer.writeUInt16LE(recordSize, 0x0C); // Record length
    
    let offset = headerSize;
    for (const acct of accounts) {
      // Account number (15 bytes)
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset, 'ascii');
      
      // Account name (50 bytes)
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 15, 'ascii');
      
      // Type (1 byte)
      let typeCode = 1;
      switch (acct.type) {
        case 'ASSET': typeCode = 1; break;
        case 'LIABILITY': typeCode = 2; break;
        case 'EQUITY': typeCode = 3; break;
        case 'REVENUE': typeCode = 4; break;
        case 'EXPENSE': typeCode = 5; break;
      }
      buffer.writeUInt8(typeCode, offset + 65);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateChartarDAT(accounts) {
    const headerSize = 4096;
    const recordSize = 512;
    const buffer = Buffer.alloc(headerSize + accounts.length * recordSize);
    
    // Btrieve header
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    buffer.writeUInt32LE(accounts.length, 0x04);
    buffer.writeUInt16LE(recordSize, 0x0C);
    
    let offset = headerSize;
    for (const acct of accounts) {
      // Account number (15 bytes)
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset, 'ascii');
      
      // Account name (50 bytes)
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 15, 'ascii');
      
      // Type code (4 bytes)
      let typeCode = 1;
      switch (acct.type) {
        case 'ASSET': typeCode = 1; break;
        case 'LIABILITY': typeCode = 2; break;
        case 'EQUITY': typeCode = 3; break;
        case 'REVENUE': typeCode = 4; break;
        case 'EXPENSE': typeCode = 5; break;
      }
      buffer.writeInt32LE(typeCode, offset + 65);
      
      // Write balance at multiple offsets for compatibility
      const balance = acct.balance || 0;
      buffer.writeDoubleLE(balance, offset + 80);
      buffer.writeDoubleLE(balance, offset + 96);
      buffer.writeDoubleLE(balance, offset + 112);
      buffer.writeDoubleLE(balance, offset + 128);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateCustomerDAT(customers) {
    const headerSize = 4096;
    const recordSize = 512;
    const buffer = Buffer.alloc(headerSize + customers.length * recordSize);
    
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    buffer.writeUInt32LE(customers.length, 0x04);
    buffer.writeUInt16LE(recordSize, 0x0C);
    
    let offset = headerSize;
    for (const cust of customers) {
      const idStr = (cust.customer_id || cust.id || '').substring(0, 20).padEnd(20, '\0');
      buffer.write(idStr, offset, 'ascii');
      
      const nameStr = (cust.name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 20, 'ascii');
      
      const contactStr = (cust.contact || '').substring(0, 30).padEnd(30, '\0');
      buffer.write(contactStr, offset + 70, 'ascii');
      
      const phoneStr = (cust.phone || '').substring(0, 20).padEnd(20, '\0');
      buffer.write(phoneStr, offset + 100, 'ascii');
      
      buffer.writeDoubleLE(cust.balance || 0, offset + 130);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateVendorDAT(vendors) {
    const headerSize = 4096;
    const recordSize = 512;
    const buffer = Buffer.alloc(headerSize + vendors.length * recordSize);
    
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    buffer.writeUInt32LE(vendors.length, 0x04);
    buffer.writeUInt16LE(recordSize, 0x0C);
    
    let offset = headerSize;
    for (const vend of vendors) {
      const idStr = (vend.vendor_id || vend.id || '').substring(0, 20).padEnd(20, '\0');
      buffer.write(idStr, offset, 'ascii');
      
      const nameStr = (vend.name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 20, 'ascii');
      
      const contactStr = (vend.contact || '').substring(0, 30).padEnd(30, '\0');
      buffer.write(contactStr, offset + 70, 'ascii');
      
      buffer.writeDoubleLE(vend.balance || 0, offset + 130);
      
      offset += recordSize;
    }

    return buffer;
  }

  generateCompanyDAT(info) {
    const buffer = Buffer.alloc(8192);
    
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    
    const name = (info.name || 'Company').substring(0, 50);
    buffer.write(name, 4096, 'ascii');
    
    if (info.address) buffer.write(info.address.substring(0, 50), 4150, 'ascii');
    if (info.city) buffer.write(info.city.substring(0, 30), 4200, 'ascii');
    if (info.phone) buffer.write(info.phone.substring(0, 20), 4230, 'ascii');
    
    return buffer;
  }

  generateDetailsIni(data) {
    const now = new Date();
    return `[DDFUpdate]
DDFVersion=20.0.0.0

[SageFlowExport]
ExportDate=${now.toISOString()}
ExportedBy=SageFlow Modern v3
TotalAccounts=${data.chart_of_accounts?.length || 0}
TotalCustomers=${data.customers?.length || 0}
TotalVendors=${data.vendors?.length || 0}

[BackupReminder]
Remind=No
UseCompanyNameInBackupName=1
LastBackupDate=${now.toLocaleDateString()}
`;
  }

  // ============ DIALOG HANDLERS ============
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

module.exports = { PTBServiceV3 };
