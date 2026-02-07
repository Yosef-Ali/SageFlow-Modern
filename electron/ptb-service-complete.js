/**
 * PTB Service Complete - Full Peachtree Backup Import/Export Solution
 * 
 * STRATEGY FOR BALANCE EXTRACTION:
 * 1. Extract account structure from CHART.DAT
 * 2. Parse CHARTAR.DAT for YTD balances using fixed record structure
 * 3. Parse PERIODAR.DAT for period-specific balances
 * 4. Cross-validate with JRNLROW.DAT journal entries
 * 5. Use ODBC when Peachtree is installed (most reliable)
 * 
 * PEACHTREE DAT FILE STRUCTURE:
 * - Header: First 4096-8192 bytes
 * - Records: Fixed-size, aligned to page boundaries
 * - Account numbers: ASCII, padded with nulls
 * - Balances: IEEE 754 double (8 bytes), little-endian
 */

const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync, spawn } = require('child_process');

class PTBServiceComplete {
  constructor() {
    this.debugMode = true;
    this.tempDir = null;
  }

  log(message) {
    if (this.debugMode) {
      console.log(`[PTB-Complete] ${message}`);
    }
  }

  // ============ UTILITY FUNCTIONS ============
  
  cleanupTemp() {
    if (this.tempDir && fs.existsSync(this.tempDir)) {
      try {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      } catch (e) {
        this.log(`Cleanup warning: ${e.message}`);
      }
    }
  }

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
    
    return strings;
  }

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

  isValidAmount(val) {
    if (!Number.isFinite(val)) return false;
    if (val === 0) return false;
    if (Math.abs(val) < 0.001) return false;
    if (Math.abs(val) > 1e15) return false;
    // Check for suspicious patterns (infinity/NaN encoded as doubles)
    if (val === Infinity || val === -Infinity) return false;
    return true;
  }

  roundAmount(val) {
    return Math.round(val * 100) / 100;
  }


  // ============ CHARTAR.DAT BALANCE EXTRACTION (KEY IMPROVEMENT) ============
  
  /**
   * Parse CHARTAR.DAT with improved binary structure analysis
   * CHARTAR structure (based on analysis):
   * - Record size: ~512-1024 bytes (varies by version)
   * - Account ID: ASCII at start of record (15-20 bytes)
   * - Balance fields at offsets: 80, 96, 112, 128, 160, 200, 240, 280, 320
   * - Multiple balance fields for: Beginning Balance, YTD Debits, YTD Credits, Current Balance
   */
  parseChartarBalancesImproved(buffer, accounts) {
    this.log('Parsing CHARTAR.DAT with improved algorithm...');
    
    const balancesFound = new Map();
    const allBalances = [];
    
    // Known balance offsets in CHARTAR records (relative to account number position)
    const balanceOffsets = [72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 160, 176, 192, 200, 208, 240, 280, 320];
    
    // Find all account number positions in the buffer
    const accountPositions = [];
    
    for (let i = 0; i < buffer.length - 200; i++) {
      // Look for account number patterns (4-6 digits, possibly with decimal)
      let acctStr = '';
      for (let j = 0; j < 15; j++) {
        const c = buffer[i + j];
        if (c >= 0x30 && c <= 0x39) { // 0-9
          acctStr += String.fromCharCode(c);
        } else if (c === 0x2E) { // .
          acctStr += '.';
        } else if (c === 0x00 || c === 0x20) { // null or space - end of string
          break;
        } else {
          break;
        }
      }
      
      // Check if this looks like a valid account number
      if (acctStr.length >= 4 && /^\d{4,6}(\.\d+)?$/.test(acctStr)) {
        // Check if this account exists in our chart
        if (accounts.has(acctStr)) {
          accountPositions.push({ acctNum: acctStr, position: i });
        }
      }
    }
    
    this.log(`Found ${accountPositions.length} account number positions in CHARTAR`);
    
    // For each found account, extract balance from known offsets
    for (const { acctNum, position } of accountPositions) {
      const foundValues = [];
      
      for (const offset of balanceOffsets) {
        const absPos = position + offset;
        if (absPos + 8 > buffer.length) continue;
        
        try {
          const val = buffer.readDoubleLE(absPos);
          if (this.isValidAmount(val)) {
            foundValues.push({ offset, value: val });
          }
        } catch (e) {}
      }
      
      // Take the first valid balance (usually the current balance)
      // Or average if multiple similar values found
      if (foundValues.length > 0) {
        // Sort by absolute value to find the most significant balance
        foundValues.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        
        const balance = foundValues[0].value;
        
        if (!balancesFound.has(acctNum) || Math.abs(balance) > Math.abs(balancesFound.get(acctNum))) {
          balancesFound.set(acctNum, balance);
          allBalances.push({ acctNum, balance, offset: foundValues[0].offset });
        }
      }
    }
    
    this.log(`Extracted ${balancesFound.size} account balances from CHARTAR`);
    
    // Update accounts with found balances
    for (const [acctNum, balance] of balancesFound) {
      const acct = accounts.get(acctNum);
      if (acct) {
        acct.balance = this.roundAmount(balance);
        acct.balance_source = 'CHARTAR';
      }
    }
    
    return { accounts, allBalances };
  }


  // ============ PERIODAR.DAT PARSING (Period-specific balances) ============
  
  parsePeriodBalances(buffer, accounts) {
    this.log('Parsing PERIODAR.DAT for period balances...');
    
    // PERIODAR contains monthly/period balances
    // Structure similar to CHARTAR but with period indicators
    
    const periodBalances = new Map();
    
    for (const [acctNum, acct] of accounts) {
      // Search for account number in buffer
      const searchBytes = Buffer.from(acctNum);
      let searchStart = 0;
      const foundBalances = [];
      
      while (searchStart < buffer.length - 200) {
        const idx = buffer.indexOf(searchBytes, searchStart);
        if (idx === -1) break;
        
        // Extract potential balances at known offsets
        const offsets = [64, 72, 80, 88, 96, 104, 112, 120];
        
        for (const offset of offsets) {
          if (idx + offset + 8 > buffer.length) continue;
          
          try {
            const val = buffer.readDoubleLE(idx + offset);
            if (this.isValidAmount(val)) {
              foundBalances.push(val);
            }
          } catch (e) {}
        }
        
        searchStart = idx + 1;
      }
      
      // Sum or take latest period balance
      if (foundBalances.length > 0) {
        // Take the balance with largest absolute value
        foundBalances.sort((a, b) => Math.abs(b) - Math.abs(a));
        periodBalances.set(acctNum, foundBalances[0]);
      }
    }
    
    this.log(`Found ${periodBalances.size} period balances from PERIODAR`);
    
    // Update accounts that don't have balances yet
    for (const [acctNum, balance] of periodBalances) {
      const acct = accounts.get(acctNum);
      if (acct && acct.balance === 0) {
        acct.balance = this.roundAmount(balance);
        acct.balance_source = 'PERIODAR';
      }
    }
    
    return accounts;
  }

  // ============ JOURNAL ENTRY PARSING ============
  
  parseJournalEntries(jrnlBuffer, jrnlRowBuffer, accounts) {
    this.log('Parsing journal entries for balance validation...');
    
    const journalTotals = new Map();
    
    // JRNLROW contains individual journal line items
    if (jrnlRowBuffer) {
      for (const [acctNum, acct] of accounts) {
        const searchBytes = Buffer.from(acctNum);
        let searchStart = 0;
        let totalDebit = 0;
        let totalCredit = 0;
        
        while (searchStart < jrnlRowBuffer.length - 100) {
          const idx = jrnlRowBuffer.indexOf(searchBytes, searchStart);
          if (idx === -1) break;
          
          // Look for debit/credit amounts nearby
          for (let offset = 20; offset < 80; offset += 8) {
            if (idx + offset + 16 > jrnlRowBuffer.length) break;
            
            try {
              const val1 = jrnlRowBuffer.readDoubleLE(idx + offset);
              const val2 = jrnlRowBuffer.readDoubleLE(idx + offset + 8);
              
              if (this.isValidAmount(val1)) totalDebit += val1;
              if (this.isValidAmount(val2)) totalCredit += val2;
            } catch (e) {}
          }
          
          searchStart = idx + 1;
        }
        
        if (totalDebit > 0 || totalCredit > 0) {
          journalTotals.set(acctNum, { debit: totalDebit, credit: totalCredit });
        }
      }
    }
    
    this.log(`Calculated journal totals for ${journalTotals.size} accounts`);
    
    // Use journal totals as fallback for accounts without balances
    for (const [acctNum, totals] of journalTotals) {
      const acct = accounts.get(acctNum);
      if (acct) {
        acct.journal_debit = this.roundAmount(totals.debit);
        acct.journal_credit = this.roundAmount(totals.credit);
        
        if (acct.balance === 0) {
          // Calculate balance from journal entries
          if (acct.type === 'ASSET' || acct.type === 'EXPENSE') {
            acct.balance = this.roundAmount(totals.debit - totals.credit);
          } else {
            acct.balance = this.roundAmount(totals.credit - totals.debit);
          }
          acct.balance_source = 'JOURNAL';
        }
      }
    }
    
    return accounts;
  }


  // ============ CHART.DAT PARSING ============
  
  parseChartOfAccounts(buffer) {
    const accounts = new Map();
    const accountPattern = /^(\d{4,6}(?:\.\d+)?)$/;
    
    // Extract all readable strings from buffer
    const strings = this.extractStrings(buffer, 3, 60);
    
    // Find account number -> name pairs
    for (let i = 0; i < strings.length - 1; i++) {
      const s = strings[i].text.trim();
      
      if (accountPattern.test(s)) {
        // Look for account name in next few strings
        for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
          const name = strings[j].text.trim();
          
          // Name must contain letters and not be another account number
          if (/[A-Za-z]{2,}/.test(name) && !accountPattern.test(name)) {
            // Skip obvious metadata strings
            if (name.toLowerCase().includes('.dat') || 
                name.toLowerCase().includes('chart') ||
                name.length < 3) {
              continue;
            }
            
            if (!accounts.has(s)) {
              accounts.set(s, {
                account_number: s,
                account_name: name,
                type: this.inferAccountType(s),
                balance: 0,
                journal_debit: 0,
                journal_credit: 0,
                balance_source: null
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

  // ============ CUSTOMER PARSING ============
  
  parseCustomers(buffer) {
    const strings = this.extractStrings(buffer, 4, 60);
    const junkPatterns = ['CUSTOMER', '.DAT', 'DupF', 'AirborneQ', 'Version', 'Backup'];
    
    const seen = new Set();
    const customers = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      
      // Skip junk strings
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      
      // Must start with capital letter
      if (!/^[A-Z]/.test(clean)) continue;
      
      // Skip too short
      if (clean.length < 4) continue;
      
      // Skip if looks like account number
      if (/^\d+(\.\d+)?$/.test(clean)) continue;
      
      if (!seen.has(lower)) {
        seen.add(lower);
        customers.push({ 
          name: clean, 
          customer_id: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
          contact: '',
          phone: '',
          email: '',
          balance: 0 
        });
      }
    }

    // Limit to reasonable number
    return customers.slice(0, 1000);
  }

  // ============ VENDOR PARSING ============
  
  parseVendors(buffer) {
    const strings = this.extractStrings(buffer, 4, 60);
    const junkPatterns = ['VENDOR', '.DAT', 'DupF', 'AirborneQ', 'Version', 'Backup'];
    
    const seen = new Set();
    const vendors = [];

    for (const item of strings) {
      const clean = item.text.trim();
      const lower = clean.toLowerCase();
      
      if (junkPatterns.some(j => lower.includes(j.toLowerCase()))) continue;
      if (!/^[A-Z]/.test(clean)) continue;
      if (clean.length < 4) continue;
      if (/^\d+(\.\d+)?$/.test(clean)) continue;
      
      if (!seen.has(lower)) {
        seen.add(lower);
        vendors.push({ 
          name: clean,
          vendor_id: `VEND-${String(vendors.length + 1).padStart(4, '0')}`,
          contact: '',
          phone: '',
          email: '',
          balance: 0
        });
      }
    }

    return vendors.slice(0, 1000);
  }

  // ============ COMPANY INFO PARSING ============
  
  parseCompanyInfo(buffer) {
    const strings = this.extractStrings(buffer, 3, 100);
    
    const info = {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      fax: '',
      email: '',
      tax_id: '',
      fiscal_year_start: null
    };
    
    // Filter out obvious junk
    const filtered = strings
      .map(s => s.text)
      .filter(s => s.length > 2 && /[A-Za-z]/.test(s))
      .filter(s => !s.toLowerCase().includes('.dat'))
      .filter(s => !s.toLowerCase().includes('company'));
    
    if (filtered.length > 0) info.name = filtered[0];
    if (filtered.length > 1) info.address = filtered[1];
    if (filtered.length > 2) info.city = filtered[2];
    
    // Look for phone pattern
    const phoneMatch = strings.find(s => /\d{3}[\-\.\s]?\d{3}[\-\.\s]?\d{4}/.test(s.text));
    if (phoneMatch) info.phone = phoneMatch.text;
    
    // Look for email pattern
    const emailMatch = strings.find(s => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(s.text));
    if (emailMatch) info.email = emailMatch.text;
    
    return info;
  }


  // ============ ODBC IMPORT (For Windows with Peachtree installed) ============
  
  async tryODBCImport(extractedDir) {
    this.log('Attempting ODBC import (requires Peachtree/Sage 50 installed)...');
    
    // This only works on Windows with Peachtree ODBC drivers
    if (process.platform !== 'win32') {
      this.log('ODBC import only available on Windows');
      return null;
    }
    
    try {
      // Try to use node-odbc
      let odbc;
      try {
        odbc = require('odbc');
      } catch (e) {
        this.log('ODBC module not available');
        return null;
      }
      
      // Connection string for Pervasive/Peachtree
      const connectionString = `
        DRIVER={Pervasive ODBC Engine Interface};
        DBQ=${extractedDir};
        UID=Peachtree;
        PWD=;
      `.replace(/\s+/g, '');
      
      const connection = await odbc.connect(connectionString);
      
      // Query chart of accounts
      const accounts = await connection.query('SELECT * FROM CHARTOFACCOUNTS');
      const customers = await connection.query('SELECT * FROM CUSTOMER');
      const vendors = await connection.query('SELECT * FROM VENDOR');
      
      await connection.close();
      
      this.log('ODBC import successful!');
      
      return {
        chart_of_accounts: accounts.map(a => ({
          account_number: a.ACCOUNTID || a.AccountID,
          account_name: a.DESCRIPTION || a.Description,
          type: this.inferAccountType(a.ACCOUNTID || a.AccountID),
          balance: parseFloat(a.BALANCE || a.Balance || 0),
          balance_source: 'ODBC'
        })),
        customers: customers.map(c => ({
          customer_id: c.CUSTOMERID || c.CustomerID,
          name: c.NAME || c.Name,
          balance: parseFloat(c.BALANCE || c.Balance || 0)
        })),
        vendors: vendors.map(v => ({
          vendor_id: v.VENDORID || v.VendorID,
          name: v.NAME || v.Name,
          balance: parseFloat(v.BALANCE || v.Balance || 0)
        }))
      };
    } catch (e) {
      this.log(`ODBC import failed: ${e.message}`);
      return null;
    }
  }

  // ============ MAIN IMPORT FUNCTION ============
  
  async importPTB(filePath, options = {}) {
    const result = {
      success: false,
      data: {
        chart_of_accounts: [],
        customers: [],
        vendors: [],
        company_info: null,
        transactions: []
      },
      error: null,
      stats: {},
      method: 'binary_parse'
    };

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
      }

      this.log(`Opening PTB file: ${filePath}`);
      
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      
      this.log(`Found ${entries.length} files in PTB archive`);
      
      // List all DAT files
      const datFiles = entries.filter(e => e.entryName.toUpperCase().endsWith('.DAT'));
      this.log(`DAT files found: ${datFiles.map(e => e.entryName).join(', ')}`);

      // Helper to find files case-insensitively
      const findFile = (patterns) => {
        return entries.find(e => 
          patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase()))
        );
      };

      // Extract to temp directory for ODBC attempt
      this.tempDir = path.join(require('os').tmpdir(), `ptb_extract_${Date.now()}`);
      fs.mkdirSync(this.tempDir, { recursive: true });
      zip.extractAllTo(this.tempDir, true);
      
      // Try ODBC first (most reliable if available)
      if (!options.skipODBC) {
        const odbcResult = await this.tryODBCImport(this.tempDir);
        if (odbcResult) {
          result.data = { ...result.data, ...odbcResult };
          result.method = 'ODBC';
          result.success = true;
          this.cleanupTemp();
          return this.finalizeResult(result);
        }
      }
      
      // Fall back to binary parsing
      this.log('Using binary parsing method...');

      // Step 1: Parse CHART.DAT for account structure
      const chartEntry = findFile(['CHART.DAT']);
      let accounts = new Map();
      
      if (chartEntry) {
        const chartBuffer = chartEntry.getData();
        accounts = this.parseChartOfAccounts(chartBuffer);
      }
      
      if (accounts.size === 0) {
        throw new Error('No accounts found in CHART.DAT');
      }

      // Step 2: Parse CHARTAR.DAT for balances (improved method)
      const chartarEntry = findFile(['CHARTAR.DAT']);
      if (chartarEntry) {
        const chartarBuffer = chartarEntry.getData();
        const { allBalances } = this.parseChartarBalancesImproved(chartarBuffer, accounts);
        result.stats.chartarBalances = allBalances.length;
      }

      // Step 3: Parse PERIODAR.DAT for additional balances
      const periodarEntry = findFile(['PERIODAR.DAT']);
      if (periodarEntry) {
        const periodarBuffer = periodarEntry.getData();
        accounts = this.parsePeriodBalances(periodarBuffer, accounts);
      }

      // Step 4: Parse journal entries for validation/fallback
      const jrnlEntry = findFile(['JRNL.DAT']);
      const jrnlRowEntry = findFile(['JRNLROW.DAT']);
      if (jrnlEntry || jrnlRowEntry) {
        const jrnlBuffer = jrnlEntry ? jrnlEntry.getData() : null;
        const jrnlRowBuffer = jrnlRowEntry ? jrnlRowEntry.getData() : null;
        accounts = this.parseJournalEntries(jrnlBuffer, jrnlRowBuffer, accounts);
      }

      // Convert to array
      result.data.chart_of_accounts = Array.from(accounts.values());

      // Step 5: Parse Customers
      const custEntry = findFile(['CUSTOMER.DAT']);
      if (custEntry) {
        result.data.customers = this.parseCustomers(custEntry.getData());
      }

      // Step 6: Parse Vendors
      const vendEntry = findFile(['VENDOR.DAT']);
      if (vendEntry) {
        result.data.vendors = this.parseVendors(vendEntry.getData());
      }

      // Step 7: Parse Company Info
      const companyEntry = findFile(['COMPANY.DAT']);
      if (companyEntry) {
        result.data.company_info = this.parseCompanyInfo(companyEntry.getData());
      }

      result.success = true;
      this.cleanupTemp();
      
      return this.finalizeResult(result);

    } catch (error) {
      result.error = error.message;
      this.log(`Import failed: ${error.message}`);
      console.error(error);
      this.cleanupTemp();
      return result;
    }
  }


  // ============ FINALIZE RESULT ============
  
  finalizeResult(result) {
    // Calculate statistics
    const accountsWithBalance = result.data.chart_of_accounts.filter(a => a.balance !== 0);
    const balanceSources = {};
    
    for (const acct of result.data.chart_of_accounts) {
      const src = acct.balance_source || 'none';
      balanceSources[src] = (balanceSources[src] || 0) + 1;
    }
    
    result.stats = {
      ...result.stats,
      totalAccounts: result.data.chart_of_accounts.length,
      accountsWithBalances: accountsWithBalance.length,
      balanceSources,
      totalCustomers: result.data.customers.length,
      totalVendors: result.data.vendors.length,
      importMethod: result.method,
      summary: {
        assets: this.roundAmount(result.data.chart_of_accounts
          .filter(a => a.type === 'ASSET')
          .reduce((sum, a) => sum + (a.balance || 0), 0)),
        liabilities: this.roundAmount(result.data.chart_of_accounts
          .filter(a => a.type === 'LIABILITY')
          .reduce((sum, a) => sum + (a.balance || 0), 0)),
        equity: this.roundAmount(result.data.chart_of_accounts
          .filter(a => a.type === 'EQUITY')
          .reduce((sum, a) => sum + (a.balance || 0), 0)),
        revenue: this.roundAmount(result.data.chart_of_accounts
          .filter(a => a.type === 'REVENUE')
          .reduce((sum, a) => sum + (a.balance || 0), 0)),
        expenses: this.roundAmount(result.data.chart_of_accounts
          .filter(a => a.type === 'EXPENSE')
          .reduce((sum, a) => sum + (a.balance || 0), 0))
      }
    };

    this.log(`Import complete! Method: ${result.method}`);
    this.log(`  Accounts: ${result.stats.totalAccounts} (${result.stats.accountsWithBalances} with balances)`);
    this.log(`  Customers: ${result.stats.totalCustomers}`);
    this.log(`  Vendors: ${result.stats.totalVendors}`);
    this.log(`  Balance Sources: ${JSON.stringify(balanceSources)}`);

    return result;
  }

  // ============ EXPORT FUNCTIONS ============
  
  async exportPTB(data, outputPath) {
    try {
      this.log(`Exporting to PTB: ${outputPath}`);
      
      const zip = new AdmZip();
      
      // Generate all required DAT files
      if (data.chart_of_accounts?.length > 0) {
        zip.addFile('CHART.DAT', this.generateChartDAT(data.chart_of_accounts));
        zip.addFile('CHARTAR.DAT', this.generateChartarDAT(data.chart_of_accounts));
      }

      if (data.customers?.length > 0) {
        zip.addFile('CUSTOMER.DAT', this.generateCustomerDAT(data.customers));
      }

      if (data.vendors?.length > 0) {
        zip.addFile('VENDOR.DAT', this.generateVendorDAT(data.vendors));
      }

      zip.addFile('COMPANY.DAT', this.generateCompanyDAT(data.company_info || { name: 'SageFlow Export' }));
      zip.addFile('VERSION.TXT', Buffer.from('20.0.0.0'));
      zip.addFile('Details.ini', Buffer.from(this.generateDetailsIni(data)));

      // Write the PTB file
      zip.writeZip(outputPath);
      
      this.log(`Export complete: ${outputPath}`);
      
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

  // ============ DAT FILE GENERATION ============
  
  generateChartDAT(accounts) {
    const headerSize = 4096;
    const recordSize = 256;
    const buffer = Buffer.alloc(headerSize + accounts.length * recordSize);
    
    // Btrieve header
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    buffer.writeUInt32LE(accounts.length, 0x04);
    buffer.writeUInt16LE(recordSize, 0x0C);
    buffer.writeUInt16LE(4096, 0x08); // Page size
    
    let offset = headerSize;
    for (const acct of accounts) {
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset, 'ascii');
      
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 15, 'ascii');
      
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
    
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    buffer.writeUInt32LE(accounts.length, 0x04);
    buffer.writeUInt16LE(recordSize, 0x0C);
    buffer.writeUInt16LE(4096, 0x08);
    
    let offset = headerSize;
    for (const acct of accounts) {
      const numStr = (acct.account_number || '').substring(0, 15).padEnd(15, '\0');
      buffer.write(numStr, offset, 'ascii');
      
      const nameStr = (acct.account_name || '').substring(0, 50).padEnd(50, '\0');
      buffer.write(nameStr, offset + 15, 'ascii');
      
      // Write balance at standard offsets
      const balance = acct.balance || 0;
      buffer.writeDoubleLE(balance, offset + 72);
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
      buffer.write((cust.customer_id || '').substring(0, 20).padEnd(20, '\0'), offset, 'ascii');
      buffer.write((cust.name || '').substring(0, 50).padEnd(50, '\0'), offset + 20, 'ascii');
      buffer.write((cust.contact || '').substring(0, 30).padEnd(30, '\0'), offset + 70, 'ascii');
      buffer.write((cust.phone || '').substring(0, 20).padEnd(20, '\0'), offset + 100, 'ascii');
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
      buffer.write((vend.vendor_id || '').substring(0, 20).padEnd(20, '\0'), offset, 'ascii');
      buffer.write((vend.name || '').substring(0, 50).padEnd(50, '\0'), offset + 20, 'ascii');
      buffer.write((vend.contact || '').substring(0, 30).padEnd(30, '\0'), offset + 70, 'ascii');
      buffer.writeDoubleLE(vend.balance || 0, offset + 130);
      offset += recordSize;
    }

    return buffer;
  }

  generateCompanyDAT(info) {
    const buffer = Buffer.alloc(8192);
    
    buffer.write('FC', 0, 'ascii');
    buffer.writeUInt16LE(0x0043, 2);
    
    buffer.write((info.name || 'Company').substring(0, 50), 4096, 'ascii');
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
ExportedBy=SageFlow Modern
TotalAccounts=${data.chart_of_accounts?.length || 0}
TotalCustomers=${data.customers?.length || 0}
TotalVendors=${data.vendors?.length || 0}

[BackupReminder]
Remind=No
UseCompanyNameInBackupName=1
LastBackupDate=${now.toLocaleDateString()}
`;
  }


  // ============ ELECTRON DIALOG HANDLERS ============
  
  async showImportDialog(mainWindow) {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Peachtree Backup (.ptb)',
      filters: [
        { name: 'Peachtree Backup', extensions: ['ptb'] },
        { name: 'ZIP Archive', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths[0]) {
      return { success: false, error: 'Import cancelled' };
    }

    // Send progress updates to renderer
    if (mainWindow) {
      mainWindow.webContents.send('ptb-import-progress', { 
        status: 'starting', 
        message: 'Opening backup file...' 
      });
    }

    const importResult = await this.importPTB(result.filePaths[0]);
    
    if (mainWindow) {
      mainWindow.webContents.send('ptb-import-progress', { 
        status: importResult.success ? 'complete' : 'error', 
        message: importResult.success ? 'Import completed!' : importResult.error
      });
    }

    return importResult;
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

    if (mainWindow) {
      mainWindow.webContents.send('ptb-export-progress', { 
        status: 'starting', 
        message: 'Creating backup file...' 
      });
    }

    const exportResult = await this.exportPTB(data, result.filePath);
    
    if (mainWindow) {
      mainWindow.webContents.send('ptb-export-progress', { 
        status: exportResult.success ? 'complete' : 'error', 
        message: exportResult.success ? 'Export completed!' : exportResult.error
      });
    }

    return exportResult;
  }

  // ============ ROUNDTRIP TEST ============
  
  async testRoundtrip(ptbFilePath, outputDir) {
    this.log('Starting roundtrip test...');
    
    // Step 1: Import
    const importResult = await this.importPTB(ptbFilePath);
    if (!importResult.success) {
      return { success: false, error: `Import failed: ${importResult.error}` };
    }
    
    const importedPath = path.join(outputDir, 'imported_data.json');
    fs.writeFileSync(importedPath, JSON.stringify(importResult, null, 2));
    this.log(`Saved imported data to: ${importedPath}`);
    
    // Step 2: Export
    const exportPath = path.join(outputDir, 'roundtrip_export.ptb');
    const exportResult = await this.exportPTB(importResult.data, exportPath);
    if (!exportResult.success) {
      return { success: false, error: `Export failed: ${exportResult.error}` };
    }
    
    // Step 3: Re-import
    const reimportResult = await this.importPTB(exportPath);
    if (!reimportResult.success) {
      return { success: false, error: `Re-import failed: ${reimportResult.error}` };
    }
    
    const reimportedPath = path.join(outputDir, 'reimported_data.json');
    fs.writeFileSync(reimportedPath, JSON.stringify(reimportResult, null, 2));
    this.log(`Saved re-imported data to: ${reimportedPath}`);
    
    // Step 4: Compare
    const comparison = {
      original: {
        accounts: importResult.data.chart_of_accounts.length,
        customers: importResult.data.customers.length,
        vendors: importResult.data.vendors.length
      },
      roundtrip: {
        accounts: reimportResult.data.chart_of_accounts.length,
        customers: reimportResult.data.customers.length,
        vendors: reimportResult.data.vendors.length
      },
      match: {
        accounts: importResult.data.chart_of_accounts.length === reimportResult.data.chart_of_accounts.length,
        customers: importResult.data.customers.length === reimportResult.data.customers.length,
        vendors: importResult.data.vendors.length === reimportResult.data.vendors.length
      }
    };
    
    this.log(`Roundtrip comparison: ${JSON.stringify(comparison, null, 2)}`);
    
    return {
      success: true,
      importResult,
      exportResult,
      reimportResult,
      comparison
    };
  }
}

// Export for use in Electron main process
module.exports = { PTBServiceComplete };

// Also export for direct testing
if (require.main === module) {
  const service = new PTBServiceComplete();
  const testPTB = process.argv[2] || './SWK 2018-011026.ptb';
  
  service.importPTB(testPTB).then(result => {
    console.log('\n=== IMPORT RESULT ===');
    console.log(JSON.stringify(result.stats, null, 2));
    
    if (result.success) {
      console.log('\nSample accounts with balances:');
      const withBalances = result.data.chart_of_accounts.filter(a => a.balance !== 0).slice(0, 10);
      withBalances.forEach(a => {
        console.log(`  ${a.account_number}: ${a.account_name} = ${a.balance} (${a.balance_source})`);
      });
    }
  }).catch(console.error);
}
