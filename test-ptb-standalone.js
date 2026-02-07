/**
 * Standalone PTB Test Script
 * Tests PTB import without Electron dependency
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Copy of the parsing logic for testing
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

function inferAccountType(accountNumber) {
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

function parseChartWithBalances(chartBuffer, chartarBuffer) {
  const accounts = new Map();
  const accountPattern = /^\d{4,6}(\.\d+)?$/;
  
  // Parse CHART.DAT
  const strings = extractStrings(chartBuffer, 3, 60);
  
  for (let i = 0; i < strings.length - 1; i++) {
    const s = strings[i].text;
    const offset = strings[i].offset;
    
    if (accountPattern.test(s)) {
      let name = null;
      for (let j = i + 1; j < Math.min(i + 5, strings.length); j++) {
        const potentialName = strings[j].text;
        if (/[A-Za-z]{2,}/.test(potentialName) && !accountPattern.test(potentialName)) {
          name = potentialName.trim();
          break;
        }
      }
      
      if (name && !accounts.has(s)) {
        accounts.set(s, {
          account_number: s,
          account_name: name,
          type: inferAccountType(s),
          balance: 0
        });
      }
    }
  }
  
  // Parse CHARTAR.DAT for balances
  if (chartarBuffer) {
    const chartarStrings = extractStrings(chartarBuffer, 3, 60);
    
    for (let i = 0; i < chartarStrings.length; i++) {
      const s = chartarStrings[i].text;
      const offset = chartarStrings[i].offset;
      
      if (accountPattern.test(s) && accounts.has(s)) {
        // Look for balance within next 100 bytes
        for (let k = offset; k < Math.min(offset + 100, chartarBuffer.length - 8); k++) {
          try {
            const val = chartarBuffer.readDoubleLE(k);
            if (val === val && Math.abs(val) > 1 && Math.abs(val) < 1e12) {
              accounts.get(s).balance = Math.round(val * 100) / 100;
              break;
            }
          } catch {}
        }
      }
    }
  }
  
  return Array.from(accounts.values());
}

async function testPTBImport() {
  const ptbPath = './SWK 2018-011026.ptb';
  
  console.log('Testing PTB Import from:', ptbPath);
  console.log('=====================================\n');
  
  const zip = new AdmZip(ptbPath);
  const entries = zip.getEntries();
  
  console.log(`Total files in PTB: ${entries.length}\n`);
  
  // List all DAT files
  const datFiles = entries.filter(e => e.entryName.toUpperCase().endsWith('.DAT'));
  console.log('DAT files found:');
  datFiles.slice(0, 20).forEach(e => console.log(`  - ${e.entryName} (${e.header.size} bytes)`));
  if (datFiles.length > 20) console.log(`  ... and ${datFiles.length - 20} more`);
  
  // Find chart files
  const chartEntry = entries.find(e => e.entryName.toUpperCase().includes('CHART.DAT'));
  const chartarEntry = entries.find(e => e.entryName.toUpperCase().includes('CHARTAR.DAT'));
  
  if (chartEntry) {
    console.log(`\n=== Parsing ${chartEntry.entryName} ===`);
    const chartBuffer = chartEntry.getData();
    const chartarBuffer = chartarEntry ? chartarEntry.getData() : null;
    
    console.log(`CHART.DAT size: ${chartBuffer.length} bytes`);
    if (chartarBuffer) console.log(`CHARTAR.DAT size: ${chartarBuffer.length} bytes`);
    
    const accounts = parseChartWithBalances(chartBuffer, chartarBuffer);
    console.log(`\nExtracted ${accounts.length} accounts`);
    
    const withBalances = accounts.filter(a => a.balance !== 0);
    console.log(`Accounts with balances: ${withBalances.length}`);
    
    console.log('\n=== SAMPLE ACCOUNTS ===');
    accounts.slice(0, 15).forEach(a => {
      const bal = a.balance !== 0 ? ` = ${a.balance.toLocaleString()}` : '';
      console.log(`  ${a.account_number.padEnd(10)} ${a.type.padEnd(10)} ${a.account_name}${bal}`);
    });
    
    if (withBalances.length > 0) {
      console.log('\n=== ACCOUNTS WITH BALANCES ===');
      withBalances.slice(0, 10).forEach(a => {
        console.log(`  ${a.account_number.padEnd(10)} ${a.account_name.padEnd(30)} ${a.balance.toLocaleString()}`);
      });
    }
    
    // Calculate totals
    let assets = 0, liabilities = 0, equity = 0, revenue = 0, expenses = 0;
    accounts.forEach(a => {
      if (a.type === 'ASSET') assets += a.balance;
      else if (a.type === 'LIABILITY') liabilities += a.balance;
      else if (a.type === 'EQUITY') equity += a.balance;
      else if (a.type === 'REVENUE') revenue += a.balance;
      else if (a.type === 'EXPENSE') expenses += a.balance;
    });
    
    console.log('\n=== BALANCE SUMMARY ===');
    console.log(`  Assets:      ${assets.toLocaleString()}`);
    console.log(`  Liabilities: ${liabilities.toLocaleString()}`);
    console.log(`  Equity:      ${equity.toLocaleString()}`);
    console.log(`  Revenue:     ${revenue.toLocaleString()}`);
    console.log(`  Expenses:    ${expenses.toLocaleString()}`);
  }
  
  // Parse customers
  const custEntry = entries.find(e => e.entryName.toUpperCase().includes('CUSTOMER.DAT'));
  if (custEntry) {
    const buffer = custEntry.getData();
    const strings = extractStrings(buffer, 4, 50);
    const customers = strings
      .filter(s => /^[A-Z]/.test(s.text) && s.text.length > 4)
      .map(s => s.text)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 50);
    
    console.log(`\n=== CUSTOMERS (${customers.length}) ===`);
    customers.slice(0, 10).forEach(c => console.log(`  - ${c}`));
  }
  
  // Parse vendors
  const vendEntry = entries.find(e => e.entryName.toUpperCase().includes('VENDOR.DAT'));
  if (vendEntry) {
    const buffer = vendEntry.getData();
    const strings = extractStrings(buffer, 4, 50);
    const vendors = strings
      .filter(s => /^[A-Z]/.test(s.text) && s.text.length > 4)
      .map(s => s.text)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 50);
    
    console.log(`\n=== VENDORS (${vendors.length}) ===`);
    vendors.slice(0, 10).forEach(v => console.log(`  - ${v}`));
  }
  
  console.log('\n=====================================');
  console.log('Test Complete!');
}

testPTBImport().catch(console.error);
