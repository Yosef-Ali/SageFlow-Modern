/**
 * PTB Service V3 - Standalone Test Version
 * No Electron dependencies for testing
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class PTBServiceV3Standalone {
  constructor() {
    this.debugMode = true;
  }

  log(message) {
    if (this.debugMode) {
      console.log(`[PTB-v3] ${message}`);
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
    
    if (current.length >= minLen && current.length <= maxLen) {
      const s = current.join('').trim();
      if (s.length >= minLen) {
        strings.push({ text: s, offset: buffer.length - current.length });
      }
    }

    return strings;
  }

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

  parseChartDAT(buffer) {
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

    return accounts;
  }

  isValidAmount(val) {
    if (!Number.isFinite(val)) return false;
    if (val === 0) return false;
    if (Math.abs(val) < 0.01) return false;
    if (Math.abs(val) > 1e12) return false;
    return true;
  }

  parseChartarBalances(buffer, accounts) {
    const balancesFound = new Map();
    
    for (const [acctNum, acct] of accounts) {
      const searchBytes = Buffer.from(acctNum);
      let searchStart = 0;
      
      while (searchStart < buffer.length) {
        const idx = buffer.indexOf(searchBytes, searchStart);
        if (idx === -1) break;
        
        for (let offset = 40; offset < 250; offset += 8) {
          if (idx + offset + 8 > buffer.length) break;
          
          try {
            const val = buffer.readDoubleLE(idx + offset);
            if (this.isValidAmount(val)) {
              if (!balancesFound.has(acctNum)) {
                balancesFound.set(acctNum, val);
                this.log(`Found balance for ${acctNum}: ${val} at offset ${offset}`);
              }
              break;
            }
          } catch {}
        }
        
        searchStart = idx + 1;
      }
    }
    
    this.log(`Found ${balancesFound.size} balances from CHARTAR`);
    
    for (const [acctNum, balance] of balancesFound) {
      const acct = accounts.get(acctNum);
      if (acct) {
        acct.balance = Math.round(balance * 100) / 100;
      }
    }
    
    return accounts;
  }

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
        customers.push({ name: clean, balance: 0 });
      }
    }

    return customers.slice(0, 500);
  }

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
        vendors.push({ name: clean, balance: 0 });
      }
    }

    return vendors.slice(0, 500);
  }

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

      const findFile = (patterns) => {
        return entries.find(e => 
          patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase()))
        );
      };

      // Parse CHART.DAT
      const chartEntry = findFile(['CHART.DAT']);
      let accounts = new Map();
      
      if (chartEntry) {
        const chartBuffer = chartEntry.getData();
        accounts = this.parseChartDAT(chartBuffer);
        this.log(`Parsed ${accounts.size} accounts from CHART.DAT`);
      }

      // Parse CHARTAR.DAT for balances
      const chartarEntry = findFile(['CHARTAR.DAT']);
      if (chartarEntry && accounts.size > 0) {
        const chartarBuffer = chartarEntry.getData();
        accounts = this.parseChartarBalances(chartarBuffer, accounts);
      }

      result.data.chart_of_accounts = Array.from(accounts.values());

      // Parse Customers
      const custEntry = findFile(['CUSTOMER.DAT']);
      if (custEntry) {
        const buffer = custEntry.getData();
        result.data.customers = this.parseCustomers(buffer);
        this.log(`Parsed ${result.data.customers.length} customers`);
      }

      // Parse Vendors
      const vendEntry = findFile(['VENDOR.DAT']);
      if (vendEntry) {
        const buffer = vendEntry.getData();
        result.data.vendors = this.parseVendors(buffer);
        this.log(`Parsed ${result.data.vendors.length} vendors`);
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

      result.success = true;

    } catch (error) {
      result.error = error.message;
      this.log(`Import failed: ${error.message}`);
    }

    return result;
  }
}

// ============ TEST ============
async function test() {
  const ptbService = new PTBServiceV3Standalone();
  
  const ptbFile = path.join(__dirname, 'SWK 2018-011026.ptb');
  
  console.log('\n========== TESTING PTB IMPORT ==========\n');
  
  const result = await ptbService.importPTB(ptbFile);
  
  if (result.success) {
    console.log('\n✅ Import successful!\n');
    
    console.log('📊 Statistics:');
    console.log(`   Total Accounts: ${result.stats.totalAccounts}`);
    console.log(`   Accounts with Balances: ${result.stats.accountsWithBalances}`);
    console.log(`   Total Customers: ${result.stats.totalCustomers}`);
    console.log(`   Total Vendors: ${result.stats.totalVendors}`);
    
    console.log('\n💰 Balance Summary:');
    console.log(`   Assets:      ${result.stats.balanceSummary.assets.toLocaleString()}`);
    console.log(`   Liabilities: ${result.stats.balanceSummary.liabilities.toLocaleString()}`);
    console.log(`   Equity:      ${result.stats.balanceSummary.equity.toLocaleString()}`);
    console.log(`   Revenue:     ${result.stats.balanceSummary.revenue.toLocaleString()}`);
    console.log(`   Expenses:    ${result.stats.balanceSummary.expenses.toLocaleString()}`);
    
    const accountsWithBalance = result.data.chart_of_accounts.filter(a => a.balance !== 0);
    
    if (accountsWithBalance.length > 0) {
      console.log('\n📋 Sample Accounts with Balances:');
      console.log('─'.repeat(70));
      
      accountsWithBalance.slice(0, 20).forEach(acct => {
        const balance = acct.balance.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        });
        console.log(`   ${acct.account_number.padEnd(10)} ${acct.account_name.substring(0, 35).padEnd(35)} ${balance.padStart(15)}`);
      });
    }
    
    // Save results
    const outputPath = path.join(__dirname, 'ptb-output', 'v3_extraction.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📁 Results saved to: ${outputPath}`);
    
  } else {
    console.error('\n❌ Import failed:', result.error);
  }
}

test().catch(console.error);
