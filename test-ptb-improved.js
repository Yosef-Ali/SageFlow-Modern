/**
 * Improved PTB Parser with correct CHARTAR.DAT structure
 * 
 * Key findings:
 * - CHARTAR.DAT stores account numbers as UInt32 (little-endian)
 * - CHART.DAT stores account numbers as ASCII strings
 * - Balance doubles are stored at specific offsets relative to account IDs
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
  if (Math.abs(val) > 1e15) return false;
  return true;
}

// Parse CHART.DAT - accounts stored as ASCII with index references
function parseChartDAT(buffer) {
  const accounts = new Map();
  
  // CHART.DAT has ASCII account numbers at specific positions
  // Structure: 16 bytes account number (ASCII padded), 4 bytes index, 4 bytes separator (0xFFFFFFFF)
  const recordSize = 24;
  
  // First, find where data starts by looking for "1000" pattern
  let dataStart = buffer.indexOf(Buffer.from('1000'));
  if (dataStart === -1) {
    console.log('Could not find data start in CHART.DAT, using default offset');
    dataStart = 0x30000; // Common default
  }
  
  // Align to start of record
  dataStart = Math.floor(dataStart / 16) * 16;
  
  console.log(`CHART.DAT data starts at offset 0x${dataStart.toString(16)}`);
  
  // Extract accounts from the ASCII account number area
  for (let i = dataStart; i < buffer.length - recordSize; i += recordSize) {
    // Try to read 16 bytes as ASCII account number
    let acctNum = '';
    for (let j = 0; j < 16; j++) {
      const c = buffer[i + j];
      if (c >= 0x30 && c <= 0x39) { // 0-9
        acctNum += String.fromCharCode(c);
      } else if (c === 0x2E) { // .
        acctNum += '.';
      } else if (c === 0x00) {
        break;
      } else {
        break;
      }
    }
    
    // Valid account number?
    if (acctNum.length >= 4 && /^\d{4,6}(\.\d+)?$/.test(acctNum)) {
      if (!accounts.has(acctNum)) {
        accounts.set(acctNum, {
          account_number: acctNum,
          account_name: '',
          type: inferAccountType(acctNum),
          balance: 0,
          balance_source: null
        });
      }
    }
  }
  
  // Now find account names from the name storage area
  const strings = extractStrings(buffer, 3, 60);
  
  // Try to match account numbers with names
  for (let i = 0; i < strings.length - 1; i++) {
    const s = strings[i].text.trim();
    
    if (/^\d{4,6}(\.\d+)?$/.test(s) && accounts.has(s)) {
      // Look for name after this position
      for (let j = i + 1; j < Math.min(i + 10, strings.length); j++) {
        const name = strings[j].text.trim();
        if (/[A-Za-z]{2,}/.test(name) && !/^\d+(\.\d+)?$/.test(name)) {
          if (name.toLowerCase().includes('.dat')) continue;
          
          const acct = accounts.get(s);
          if (acct && !acct.account_name) {
            acct.account_name = name;
          }
          break;
        }
      }
    }
  }
  
  return accounts;
}

// Parse CHARTAR.DAT - account IDs stored as UInt32
function parseChartarBalances(buffer, accounts) {
  console.log('Parsing CHARTAR.DAT (account IDs as UInt32)...');
  
  const balancesFound = new Map();
  
  // Convert account numbers to integers for matching
  const accountInts = new Map();
  for (const [acctStr, acct] of accounts) {
    // Handle accounts like "1011.1" -> 10111 or just use base
    const baseNum = parseInt(acctStr.split('.')[0]);
    if (!isNaN(baseNum)) {
      if (!accountInts.has(baseNum)) {
        accountInts.set(baseNum, []);
      }
      accountInts.get(baseNum).push(acctStr);
    }
  }
  
  console.log(`Looking for ${accountInts.size} unique account base numbers`);
  
  // Scan for UInt32 values matching known account numbers
  for (let i = 0; i < buffer.length - 200; i += 4) {
    const intVal = buffer.readUInt32LE(i);
    
    // Check if this matches a known account base number
    if (accountInts.has(intVal)) {
      const matchedAccounts = accountInts.get(intVal);
      
      // Look for balance values BEFORE this position (common in Btrieve)
      // Typical offsets: -16, -24, -32, -40, -48 bytes before account ID
      const balanceOffsets = [-48, -40, -32, -24, -16, -8, 8, 16, 24, 32, 40, 48, 56, 64];
      
      for (const offset of balanceOffsets) {
        const balancePos = i + offset;
        if (balancePos < 0 || balancePos + 8 > buffer.length) continue;
        
        try {
          const val = buffer.readDoubleLE(balancePos);
          if (isValidAmount(val) && Math.abs(val) < 1e10) {
            // This could be a balance
            for (const acctStr of matchedAccounts) {
              if (!balancesFound.has(acctStr)) {
                balancesFound.set(acctStr, {
                  balance: val,
                  offset: offset,
                  position: balancePos
                });
              }
            }
            break; // Found a valid balance, stop looking
          }
        } catch {}
      }
    }
  }
  
  console.log(`Found ${balancesFound.size} balances via UInt32 account ID matching`);
  
  // Update accounts with found balances
  for (const [acctStr, { balance, offset }] of balancesFound) {
    const acct = accounts.get(acctStr);
    if (acct) {
      acct.balance = Math.round(balance * 100) / 100;
      acct.balance_source = `CHARTAR:offset${offset}`;
    }
  }
  
  return accounts;
}

// Alternative: Extract all valid doubles and try to match by position patterns
function extractAllBalances(buffer) {
  console.log('\nExtracting all valid monetary values from CHARTAR...');
  
  const allAmounts = [];
  
  for (let i = 0; i < buffer.length - 8; i += 8) {
    try {
      const val = buffer.readDoubleLE(i);
      // Valid monetary amount (reasonable range for accounting)
      if (Number.isFinite(val) && Math.abs(val) > 0.01 && Math.abs(val) < 1e9) {
        allAmounts.push({ offset: i, value: Math.round(val * 100) / 100 });
      }
    } catch {}
  }
  
  console.log(`Found ${allAmounts.length} potential balance values`);
  
  // Show distribution
  const distribution = {
    under1000: 0,
    under10000: 0,
    under100000: 0,
    under1000000: 0,
    over1000000: 0
  };
  
  for (const { value } of allAmounts) {
    const abs = Math.abs(value);
    if (abs < 1000) distribution.under1000++;
    else if (abs < 10000) distribution.under10000++;
    else if (abs < 100000) distribution.under100000++;
    else if (abs < 1000000) distribution.under1000000++;
    else distribution.over1000000++;
  }
  
  console.log('Value distribution:', distribution);
  
  // Return unique values sorted by absolute value
  const uniqueValues = [...new Set(allAmounts.map(a => a.value))];
  uniqueValues.sort((a, b) => Math.abs(b) - Math.abs(a));
  
  return uniqueValues.slice(0, 200);
}

// Main test
async function main() {
  const ptbPath = './SWK 2018-011026.ptb';
  
  console.log('='.repeat(60));
  console.log('IMPROVED PTB IMPORT TEST');
  console.log('='.repeat(60));
  
  const zip = new AdmZip(ptbPath);
  const entries = zip.getEntries();
  
  // Parse CHART.DAT first
  const chartEntry = entries.find(e => e.entryName.toUpperCase() === 'CHART.DAT' || e.entryName.toUpperCase().endsWith('/CHART.DAT'));
  let accounts = new Map();
  
  if (chartEntry) {
    accounts = parseChartDAT(chartEntry.getData());
    console.log(`\nParsed ${accounts.size} accounts from CHART.DAT`);
    
    // Show sample accounts
    const sample = Array.from(accounts.values()).slice(0, 5);
    console.log('Sample accounts:');
    sample.forEach(a => console.log(`  ${a.account_number}: ${a.account_name || '(no name)'}`));
  }
  
  // Parse CHARTAR.DAT for balances
  const chartarEntry = entries.find(e => e.entryName.toUpperCase().includes('CHARTAR.DAT'));
  if (chartarEntry) {
    const chartarBuffer = chartarEntry.getData();
    
    // Method 1: UInt32 account ID matching
    accounts = parseChartarBalances(chartarBuffer, accounts);
    
    // Method 2: Extract all balances
    const allBalances = extractAllBalances(chartarBuffer);
    
    console.log('\nTop 30 extracted balance values:');
    allBalances.slice(0, 30).forEach((val, i) => {
      console.log(`  ${i+1}. ${val.toFixed(2)}`);
    });
  }
  
  // Results
  const accountList = Array.from(accounts.values());
  const withBalances = accountList.filter(a => a.balance !== 0);
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Total accounts: ${accountList.length}`);
  console.log(`Accounts with balances: ${withBalances.length}`);
  
  if (withBalances.length > 0) {
    console.log('\n--- Accounts with Balances ---');
    withBalances.forEach(a => {
      console.log(`${a.account_number.padEnd(10)} ${(a.account_name || '').substring(0, 30).padEnd(32)} ${a.balance.toFixed(2).padStart(15)} (${a.balance_source})`);
    });
  }
  
  // Save output
  fs.writeFileSync('./ptb-output/improved_extraction.json', JSON.stringify({
    accounts: accountList,
    stats: { total: accountList.length, withBalances: withBalances.length }
  }, null, 2));
  
  console.log('\nSaved to ./ptb-output/improved_extraction.json');
}

main().catch(console.error);
