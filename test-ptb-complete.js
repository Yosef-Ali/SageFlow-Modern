/**
 * Standalone PTB Test Script
 * Tests the PTB parsing without Electron dependency
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class PTBTester {
  constructor() {
    this.debugMode = true;
  }

  log(message) {
    console.log(`[PTB-Test] ${message}`);
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
    const numStr = String(accountNumber).replace(/[.\-]/g, '');
    const num = parseInt(numStr.substring(0, 4), 10);
    if (num >= 1000 && num < 2000) return 'ASSET';
    if (num >= 2000 && num < 3000) return 'LIABILITY';
    if (num >= 3000 && num < 4000) return 'EQUITY';
    if (num >= 4000 && num < 5000) return 'REVENUE';
    if (num >= 5000) return 'EXPENSE';
    return 'ASSET';
  }

  isValidAmount(val) {
    if (!Number.isFinite(val)) return false;
    if (val === 0) return false;
    if (Math.abs(val) < 0.001) return false;
    if (Math.abs(val) > 1e15) return false;
    return true;
  }

  parseChartOfAccounts(buffer) {
    const accounts = new Map();
    const accountPattern = /^(\d{4,6}(?:\.\d+)?)$/;
    const strings = this.extractStrings(buffer, 3, 60);
    
    for (let i = 0; i < strings.length - 1; i++) {
      const s = strings[i].text.trim();
      
      if (accountPattern.test(s)) {
        for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
          const name = strings[j].text.trim();
          if (/[A-Za-z]{2,}/.test(name) && !accountPattern.test(name)) {
            if (name.toLowerCase().includes('.dat') || name.length < 3) continue;
            
            if (!accounts.has(s)) {
              accounts.set(s, {
                account_number: s,
                account_name: name,
                type: this.inferAccountType(s),
                balance: 0,
                balance_source: null
              });
            }
            break;
          }
        }
      }
    }
    return accounts;
  }

  parseChartarBalances(buffer, accounts) {
    this.log('Parsing CHARTAR.DAT for balances...');
    
    const balancesFound = new Map();
    const balanceOffsets = [72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 160, 176, 192, 200, 208, 240, 280, 320];
    
    // Find all account positions
    const accountPositions = [];
    
    for (let i = 0; i < buffer.length - 200; i++) {
      let acctStr = '';
      for (let j = 0; j < 15; j++) {
        const c = buffer[i + j];
        if (c >= 0x30 && c <= 0x39) {
          acctStr += String.fromCharCode(c);
        } else if (c === 0x2E) {
          acctStr += '.';
        } else if (c === 0x00 || c === 0x20) {
          break;
        } else {
          break;
        }
      }
      
      if (acctStr.length >= 4 && /^\d{4,6}(\.\d+)?$/.test(acctStr)) {
        if (accounts.has(acctStr)) {
          accountPositions.push({ acctNum: acctStr, position: i });
        }
      }
    }
    
    this.log(`Found ${accountPositions.length} account positions in CHARTAR`);
    
    // Extract balances
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
      
      if (foundValues.length > 0) {
        foundValues.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        const balance = foundValues[0].value;
        
        if (!balancesFound.has(acctNum) || Math.abs(balance) > Math.abs(balancesFound.get(acctNum))) {
          balancesFound.set(acctNum, { balance, offset: foundValues[0].offset });
        }
      }
    }
    
    this.log(`Extracted ${balancesFound.size} account balances`);
    
    // Update accounts
    for (const [acctNum, { balance, offset }] of balancesFound) {
      const acct = accounts.get(acctNum);
      if (acct) {
        acct.balance = Math.round(balance * 100) / 100;
        acct.balance_source = `CHARTAR:${offset}`;
      }
    }
    
    return accounts;
  }

  async testImport(ptbPath) {
    console.log('\n' + '='.repeat(60));
    console.log('PTB IMPORT TEST');
    console.log('='.repeat(60));
    console.log(`File: ${ptbPath}`);
    
    if (!fs.existsSync(ptbPath)) {
      console.error('File not found!');
      return;
    }
    
    const zip = new AdmZip(ptbPath);
    const entries = zip.getEntries();
    
    console.log(`\nFiles in PTB: ${entries.length}`);
    entries.filter(e => e.entryName.endsWith('.DAT')).forEach(e => {
      console.log(`  - ${e.entryName} (${e.getData().length} bytes)`);
    });
    
    // Find files
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
      accounts = this.parseChartOfAccounts(chartBuffer);
      console.log(`\nParsed ${accounts.size} accounts from CHART.DAT`);
    }
    
    // Parse CHARTAR.DAT for balances
    const chartarEntry = findFile(['CHARTAR.DAT']);
    if (chartarEntry && accounts.size > 0) {
      const chartarBuffer = chartarEntry.getData();
      accounts = this.parseChartarBalances(chartarBuffer, accounts);
    }
    
    // Results
    const accountList = Array.from(accounts.values());
    const withBalances = accountList.filter(a => a.balance !== 0);
    
    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`Total accounts: ${accountList.length}`);
    console.log(`Accounts with balances: ${withBalances.length}`);
    
    // Show accounts with balances
    console.log('\n--- Accounts with Balances ---');
    withBalances.slice(0, 20).forEach(a => {
      console.log(`${a.account_number.padEnd(10)} ${a.account_name.substring(0, 30).padEnd(32)} ${a.balance.toFixed(2).padStart(15)} (${a.balance_source})`);
    });
    
    if (withBalances.length > 20) {
      console.log(`... and ${withBalances.length - 20} more`);
    }
    
    // Summary by type
    console.log('\n--- Balance Summary by Type ---');
    const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    for (const type of types) {
      const total = accountList
        .filter(a => a.type === type)
        .reduce((sum, a) => sum + (a.balance || 0), 0);
      console.log(`${type.padEnd(12)}: ${total.toFixed(2).padStart(15)}`);
    }
    
    // Save results
    const outputPath = './ptb-output/complete_extraction.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      chart_of_accounts: accountList,
      stats: {
        total: accountList.length,
        withBalances: withBalances.length
      }
    }, null, 2));
    console.log(`\nSaved to: ${outputPath}`);
  }
}

// Run test
const tester = new PTBTester();
const ptbFile = process.argv[2] || './SWK 2018-011026.ptb';
tester.testImport(ptbFile).catch(console.error);
