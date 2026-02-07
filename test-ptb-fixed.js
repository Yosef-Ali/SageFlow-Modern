/**
 * Fixed PTB Parser - Correct CHART.DAT structure parsing
 * 
 * CHART.DAT Structure (from hex analysis):
 * - Record size: 24 bytes
 * - Bytes 0-15: Account number (ASCII, null-padded)
 * - Bytes 16-19: Index value (4 bytes)
 * - Bytes 20-23: Separator (0xFFFFFFFF)
 * 
 * Account names are stored separately and need string extraction
 */

const fs = require('fs');
const AdmZip = require('adm-zip');

function extractStrings(buffer, minLen = 4, maxLen = 60) {
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

function inferAccountType(acctNum) {
  const num = parseInt(String(acctNum).replace(/[.\-]/g, '').substring(0, 4));
  if (num >= 1000 && num < 2000) return 'ASSET';
  if (num >= 2000 && num < 3000) return 'LIABILITY';
  if (num >= 3000 && num < 4000) return 'EQUITY';
  if (num >= 4000 && num < 5000) return 'REVENUE';
  if (num >= 5000) return 'EXPENSE';
  return 'ASSET';
}

function isValidAmount(val) {
  if (!Number.isFinite(val)) return false;
  if (val === 0) return false;
  if (Math.abs(val) < 0.001) return false;
  if (Math.abs(val) > 1e12) return false;
  return true;
}

// Parse CHART.DAT correctly
function parseChartDAT(buffer) {
  console.log(`CHART.DAT size: ${buffer.length} bytes`);
  
  const accounts = new Map();
  const accountPattern = /^\d{4,6}(\.\d+)?$/;
  
  // Method 1: Scan for all account number patterns in the entire buffer
  for (let i = 0; i < buffer.length - 16; i++) {
    // Check if this looks like an account number (4-6 digits, possibly with decimal)
    let acctStr = '';
    let validChars = true;
    
    for (let j = 0; j < 16 && validChars; j++) {
      const c = buffer[i + j];
      if (c >= 0x30 && c <= 0x39) { // 0-9
        acctStr += String.fromCharCode(c);
      } else if (c === 0x2E) { // .
        acctStr += '.';
      } else if (c === 0x00) { // null terminator
        break;
      } else {
        validChars = false;
      }
    }
    
    // Check if followed by proper record structure
    // After account number (16 bytes), should be index + separator
    if (acctStr.length >= 4 && accountPattern.test(acctStr)) {
      // Check for 0xFFFFFFFF separator at expected position
      const sepOffset = i + 20;
      if (sepOffset + 4 <= buffer.length) {
        const sep = buffer.readUInt32LE(sepOffset);
        if (sep === 0xFFFFFFFF) {
          // This looks like a valid record
          if (!accounts.has(acctStr)) {
            accounts.set(acctStr, {
              account_number: acctStr,
              account_name: '',
              type: inferAccountType(acctStr),
              balance: 0,
              balance_source: null,
              _chartIndex: buffer.readUInt16LE(i + 16) // Store index for later reference
            });
          }
        }
      }
    }
  }
  
  console.log(`Found ${accounts.size} accounts via record structure analysis`);
  
  // Method 2: Also extract strings and look for account number -> name pairs
  const strings = extractStrings(buffer, 3, 60);
  const junk = ['.dat', 'chart', 'account', 'version', 'backup'];
  
  for (let i = 0; i < strings.length - 1; i++) {
    const s = strings[i].text.trim();
    
    if (accountPattern.test(s)) {
      // Make sure we have this account
      if (!accounts.has(s)) {
        accounts.set(s, {
          account_number: s,
          account_name: '',
          type: inferAccountType(s),
          balance: 0,
          balance_source: null
        });
      }
      
      // Look for account name in subsequent strings
      for (let j = i + 1; j < Math.min(i + 8, strings.length); j++) {
        const name = strings[j].text.trim();
        const nameLower = name.toLowerCase();
        
        // Skip if it's another account number or junk
        if (accountPattern.test(name)) continue;
        if (junk.some(j => nameLower.includes(j))) continue;
        if (name.length < 3) continue;
        if (!/[A-Za-z]{2,}/.test(name)) continue;
        
        // Found a potential name
        const acct = accounts.get(s);
        if (acct && !acct.account_name) {
          acct.account_name = name;
        }
        break;
      }
    }
  }
  
  return accounts;
}

// Parse CHARTAR for balances using multiple strategies
function parseChartarBalances(buffer, accounts) {
  console.log(`\nParsing CHARTAR.DAT (${buffer.length} bytes)...`);
  
  // Strategy 1: Look for UInt32 account IDs and extract nearby doubles
  const accountInts = new Map();
  for (const [acctStr, acct] of accounts) {
    const baseNum = parseInt(acctStr.split('.')[0]);
    if (!isNaN(baseNum) && baseNum >= 1000 && baseNum <= 99999) {
      if (!accountInts.has(baseNum)) {
        accountInts.set(baseNum, []);
      }
      accountInts.get(baseNum).push(acctStr);
    }
  }
  
  console.log(`Looking for ${accountInts.size} unique account base numbers as UInt32...`);
  
  let matchCount = 0;
  const balanceOffsets = [-64, -56, -48, -40, -32, -24, -16, -8, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96];
  
  for (let i = 0; i < buffer.length - 4; i += 2) {
    try {
      const intVal = buffer.readUInt32LE(i);
      
      if (accountInts.has(intVal)) {
        const matchedAccounts = accountInts.get(intVal);
        
        // Look for doubles around this position
        for (const offset of balanceOffsets) {
          const pos = i + offset;
          if (pos < 0 || pos + 8 > buffer.length) continue;
          
          try {
            const val = buffer.readDoubleLE(pos);
            // Valid accounting amount?
            if (isValidAmount(val) && Math.abs(val) < 1e9) {
              for (const acctStr of matchedAccounts) {
                const acct = accounts.get(acctStr);
                if (acct && acct.balance === 0) {
                  acct.balance = Math.round(val * 100) / 100;
                  acct.balance_source = `CHARTAR:id@${i}:bal@${offset}`;
                  matchCount++;
                }
              }
              break;
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  console.log(`Strategy 1 matched ${matchCount} balances via UInt32 IDs`);
  
  // Strategy 2: Find doubles and map to accounts by position/sequence
  // First, extract all reasonable balance values
  const allBalances = [];
  for (let i = 0; i < buffer.length - 8; i += 8) {
    try {
      const val = buffer.readDoubleLE(i);
      if (isValidAmount(val) && Math.abs(val) > 0.01 && Math.abs(val) < 1e9) {
        allBalances.push({ offset: i, value: Math.round(val * 100) / 100 });
      }
    } catch {}
  }
  
  console.log(`Strategy 2 found ${allBalances.length} potential balance values`);
  
  // Sort accounts by number
  const sortedAccounts = [...accounts.values()].sort((a, b) => {
    const numA = parseFloat(a.account_number);
    const numB = parseFloat(b.account_number);
    return numA - numB;
  });
  
  // Try to match by sequence if accounts without balances exist
  const accountsWithoutBalance = sortedAccounts.filter(a => a.balance === 0);
  if (accountsWithoutBalance.length > 0 && allBalances.length >= accountsWithoutBalance.length) {
    console.log(`${accountsWithoutBalance.length} accounts still without balances`);
    
    // This is heuristic - may not be accurate for all files
    // Only use if we have roughly same number of balances as accounts
    const ratio = allBalances.length / accounts.size;
    if (ratio >= 0.8 && ratio <= 1.5) {
      console.log(`Balance/Account ratio: ${ratio.toFixed(2)}, attempting sequential mapping...`);
      
      // Sort balances by offset
      allBalances.sort((a, b) => a.offset - b.offset);
      
      // Try to find patterns in balance positions
      // Typically balances appear in same order as accounts
      // But we need to be careful not to assign wrong balances
    }
  }
  
  return accounts;
}

// Parse PERIODAR.DAT for additional balance information
function parsePeriodarBalances(buffer, accounts) {
  console.log(`\nParsing PERIODAR.DAT (${buffer.length} bytes)...`);
  
  // PERIODAR contains period-specific balances
  // Similar approach: look for account IDs as UInt32 and extract nearby doubles
  
  const accountInts = new Map();
  for (const [acctStr, acct] of accounts) {
    const baseNum = parseInt(acctStr.split('.')[0]);
    if (!isNaN(baseNum) && baseNum >= 1000) {
      if (!accountInts.has(baseNum)) {
        accountInts.set(baseNum, []);
      }
      accountInts.get(baseNum).push(acctStr);
    }
  }
  
  let matchCount = 0;
  
  for (let i = 0; i < buffer.length - 4; i += 2) {
    try {
      const intVal = buffer.readUInt32LE(i);
      
      if (accountInts.has(intVal)) {
        const matchedAccounts = accountInts.get(intVal);
        
        // Look for doubles around this position
        for (const offset of [-32, -24, -16, -8, 8, 16, 24, 32, 40, 48]) {
          const pos = i + offset;
          if (pos < 0 || pos + 8 > buffer.length) continue;
          
          try {
            const val = buffer.readDoubleLE(pos);
            if (isValidAmount(val) && Math.abs(val) < 1e9) {
              for (const acctStr of matchedAccounts) {
                const acct = accounts.get(acctStr);
                if (acct && acct.balance === 0) {
                  acct.balance = Math.round(val * 100) / 100;
                  acct.balance_source = `PERIODAR:${offset}`;
                  matchCount++;
                }
              }
              break;
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  console.log(`PERIODAR matched ${matchCount} additional balances`);
  return accounts;
}

// Main
async function main() {
  const ptbPath = './SWK 2018-011026.ptb';
  
  console.log('='.repeat(70));
  console.log('FIXED PTB PARSER TEST');
  console.log('='.repeat(70));
  
  const zip = new AdmZip(ptbPath);
  const entries = zip.getEntries();
  
  console.log(`PTB contains ${entries.length} files`);
  
  // Parse CHART.DAT
  const chartEntry = entries.find(e => e.entryName.toUpperCase() === 'CHART.DAT' || e.entryName.toUpperCase().endsWith('/CHART.DAT'));
  let accounts = new Map();
  
  if (chartEntry) {
    accounts = parseChartDAT(chartEntry.getData());
  }
  
  // Parse CHARTAR.DAT
  const chartarEntry = entries.find(e => e.entryName.toUpperCase().includes('CHARTAR.DAT'));
  if (chartarEntry) {
    accounts = parseChartarBalances(chartarEntry.getData(), accounts);
  }
  
  // Parse PERIODAR.DAT
  const periodarEntry = entries.find(e => e.entryName.toUpperCase().includes('PERIODAR.DAT'));
  if (periodarEntry) {
    accounts = parsePeriodarBalances(periodarEntry.getData(), accounts);
  }
  
  // Results
  const accountList = Array.from(accounts.values());
  const withNames = accountList.filter(a => a.account_name);
  const withBalances = accountList.filter(a => a.balance !== 0);
  
  console.log('\n' + '='.repeat(70));
  console.log('FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`Total accounts: ${accountList.length}`);
  console.log(`Accounts with names: ${withNames.length}`);
  console.log(`Accounts with balances: ${withBalances.length}`);
  
  // Show sample accounts
  console.log('\n--- Sample Accounts (first 20) ---');
  accountList.sort((a, b) => parseFloat(a.account_number) - parseFloat(b.account_number));
  accountList.slice(0, 20).forEach(a => {
    console.log(`${a.account_number.padEnd(10)} ${(a.account_name || '(no name)').substring(0, 35).padEnd(37)} ${a.balance.toFixed(2).padStart(15)} ${a.type.padStart(10)}`);
  });
  
  // Show accounts with balances
  if (withBalances.length > 0) {
    console.log('\n--- Accounts WITH Balances ---');
    withBalances.slice(0, 30).forEach(a => {
      console.log(`${a.account_number.padEnd(10)} ${(a.account_name || '').substring(0, 35).padEnd(37)} ${a.balance.toFixed(2).padStart(15)} (${a.balance_source})`);
    });
  }
  
  // Summary by type
  console.log('\n--- Balance Summary by Type ---');
  const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
  for (const type of types) {
    const total = accountList
      .filter(a => a.type === type)
      .reduce((sum, a) => sum + (a.balance || 0), 0);
    const count = accountList.filter(a => a.type === type).length;
    console.log(`${type.padEnd(12)}: ${count.toString().padStart(3)} accounts, Total: ${total.toFixed(2).padStart(15)}`);
  }
  
  // Save output
  const output = {
    chart_of_accounts: accountList,
    stats: {
      total: accountList.length,
      withNames: withNames.length,
      withBalances: withBalances.length
    }
  };
  
  fs.writeFileSync('./ptb-output/fixed_extraction.json', JSON.stringify(output, null, 2));
  console.log('\nSaved to ./ptb-output/fixed_extraction.json');
}

main().catch(console.error);
