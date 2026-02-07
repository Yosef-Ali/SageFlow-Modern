/**
 * Standalone Test for Enhanced PTB Parser (no Electron dependencies)
 * Run: node test-ptb-standalone-enhanced.js
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class PTBParser {
  constructor() {
    this.debugMode = true;
  }

  log(message) {
    if (this.debugMode) {
      console.log(`[PTB] ${message}`);
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

  isValidBalance(val) {
    if (!Number.isFinite(val)) return false;
    if (val === 0) return false;
    if (Math.abs(val) < 0.01) return false;
    if (Math.abs(val) > 1e12) return false;
    if (Math.abs(val) < 1e-10 && val !== 0) return false;
    return true;
  }

  /**
   * Enhanced CHARTAR parsing with better balance detection
   */
  parseChartarRecords(buffer) {
    const accounts = new Map();
    const accountPattern = /^\d{4,6}(\.\d+)?$/;
    
    // First pass: Find all account number positions with Btrieve markers
    const accountPositions = [];
    
    for (let i = 0; i < buffer.length - 200; i++) {
      // Look for Btrieve record markers (0x04 0x00)
      if (buffer[i] === 0x04 && buffer[i + 1] === 0x00) {
        const potentialAcct = [];
        for (let j = 2; j < 12; j++) {
          const c = buffer[i + j];
          if (c >= 0x30 && c <= 0x39) {
            potentialAcct.push(String.fromCharCode(c));
          } else if (c === 0x2E) {
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

    // Second pass: Extract details and find balances
    for (let idx = 0; idx < accountPositions.length; idx++) {
      const pos = accountPositions[idx];
      const nextPos = accountPositions[idx + 1]?.offset || buffer.length;
      const recordEnd = Math.min(pos.offset + 512, nextPos);
      
      const recordBuffer = buffer.subarray(pos.offset, recordEnd);
      
      // Extract account name
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
      let foundAt = '';
      
      // Strategy A: Common Peachtree balance offsets
      const commonOffsets = [64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176, 184, 192, 200, 208, 216, 224];
      
      for (const offset of commonOffsets) {
        if (offset + 8 <= recordBuffer.length) {
          try {
            const val = recordBuffer.readDoubleLE(offset);
            if (this.isValidBalance(val)) {
              balance = Math.round(val * 100) / 100;
              foundAt = `offset ${offset}`;
              break;
            }
          } catch {}
        }
      }

      // Strategy B: Full record scan for valid doubles
      if (balance === 0) {
        for (let offset = 50; offset < recordBuffer.length - 8; offset += 2) {
          try {
            const val = recordBuffer.readDoubleLE(offset);
            if (this.isValidBalance(val) && Math.abs(val) >= 1) {
              const nextVal = offset + 8 < recordBuffer.length - 8 
                ? recordBuffer.readDoubleLE(offset + 8) : 0;
              
              if (nextVal === 0 || this.isValidBalance(nextVal)) {
                balance = Math.round(val * 100) / 100;
                foundAt = `scan offset ${offset}`;
                break;
              }
            }
          } catch {}
        }
      }

      if (accountName && !accounts.has(pos.accountNumber)) {
        accounts.set(pos.accountNumber, {
          account_number: pos.accountNumber,
          account_name: accountName,
          type: this.inferAccountType(pos.accountNumber),
          balance: balance,
          _foundAt: foundAt
        });
      }
    }

    return Array.from(accounts.values());
  }

  /**
   * Parse CHART.DAT for basic account structure
   */
  parseChartBasic(buffer) {
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
   * Combine all extraction strategies
   */
  extractAccounts(chartBuffer, chartarBuffer) {
    const chartAccounts = this.parseChartBasic(chartBuffer);
    const accountsMap = new Map(chartAccounts.map(a => [a.account_number, a]));
    
    this.log(`Found ${chartAccounts.length} accounts in CHART.DAT`);
    
    if (chartarBuffer) {
      const chartarAccounts = this.parseChartarRecords(chartarBuffer);
      this.log(`Found ${chartarAccounts.length} accounts in CHARTAR.DAT`);
      
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
      
      this.log(`Updated ${updatedCount} accounts with balances`);
    }
    
    return Array.from(accountsMap.values());
  }

  /**
   * Full PTB import
   */
  async importPTB(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }

    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    
    console.log(`\n📦 Processing ${entries.length} files from ${path.basename(filePath)}\n`);

    const findFile = (patterns) => {
      return entries.find(e => 
        patterns.some(p => e.entryName.toUpperCase().includes(p.toUpperCase()))
      );
    };

    // Extract CHART.DAT and CHARTAR.DAT
    const chartEntry = findFile(['CHART.DAT']);
    const chartarEntry = findFile(['CHARTAR.DAT']);
    
    const chartBuffer = chartEntry ? chartEntry.getData() : null;
    const chartarBuffer = chartarEntry ? chartarEntry.getData() : null;

    if (!chartBuffer) {
      throw new Error('CHART.DAT not found in PTB file');
    }

    console.log(`  CHART.DAT: ${chartBuffer.length} bytes`);
    if (chartarBuffer) {
      console.log(`  CHARTAR.DAT: ${chartarBuffer.length} bytes`);
    }

    const accounts = this.extractAccounts(chartBuffer, chartarBuffer);
    
    return accounts;
  }
}

// Main execution
async function main() {
  console.log('\n🔬 Enhanced PTB Parser Test\n');
  console.log('='.repeat(70));

  const ptbPath = path.join(__dirname, 'SWK 2018-011026.ptb');
  
  if (!fs.existsSync(ptbPath)) {
    console.error(`❌ File not found: ${ptbPath}`);
    process.exit(1);
  }

  const parser = new PTBParser();
  
  try {
    const accounts = await parser.importPTB(ptbPath);
    
    console.log(`\n✅ Extracted ${accounts.length} total accounts\n`);
    
    // Statistics
    const withBalances = accounts.filter(a => a.balance !== 0);
    console.log(`📊 Accounts with non-zero balances: ${withBalances.length}`);
    
    // Balance summary by type
    const summary = {
      ASSET: 0,
      LIABILITY: 0,
      EQUITY: 0,
      REVENUE: 0,
      EXPENSE: 0
    };
    
    for (const a of accounts) {
      if (summary.hasOwnProperty(a.type)) {
        summary[a.type] += a.balance || 0;
      }
    }
    
    console.log('\n💰 Balance Summary:');
    console.log(`  Assets:      ${summary.ASSET.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`);
    console.log(`  Liabilities: ${summary.LIABILITY.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`);
    console.log(`  Equity:      ${summary.EQUITY.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`);
    console.log(`  Revenue:     ${summary.REVENUE.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`);
    console.log(`  Expenses:    ${summary.EXPENSE.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`);
    
    // Show top accounts with balances
    const sortedAccounts = withBalances
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 25);
    
    console.log('\n📋 Top 25 Accounts with Balances:');
    console.log('-'.repeat(80));
    console.log(`${'Acct#'.padEnd(10)} ${'Name'.padEnd(40)} ${'Type'.padEnd(12)} ${'Balance'.padStart(15)}`);
    console.log('-'.repeat(80));
    
    for (const a of sortedAccounts) {
      console.log(
        `${a.account_number.padEnd(10)} ` +
        `${a.account_name.slice(0, 40).padEnd(40)} ` +
        `${a.type.padEnd(12)} ` +
        `${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(15)}`
      );
    }
    
    console.log('-'.repeat(80));
    
    // Save output
    const outputPath = path.join(__dirname, 'ptb-output', 'enhanced_extraction.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      accounts: accounts,
      summary: summary,
      stats: {
        total: accounts.length,
        withBalances: withBalances.length
      }
    }, null, 2));
    
    console.log(`\n💾 Saved results to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Test Complete!\n');
}

main().catch(console.error);
