/**
 * PTB Service Final - Correct balance extraction
 * 
 * DISCOVERED STRUCTURE:
 * - CHART.DAT: Account IDs stored as ASCII strings (16 bytes each)
 * - CHARTAR.DAT: Account IDs stored as UInt32 integers, followed by balance data
 * - Record pattern in CHARTAR: [double balance][UInt32 acct_id][2 bytes padding][2 bytes index]
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

class PTBServiceFinal {
  constructor() {
    this.debugMode = true;
  }

  log(message) {
    if (this.debugMode) {
      console.log(`[PTB-Final] ${message}`);
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
    if (Math.abs(val) < 0.001) return false;
    if (Math.abs(val) > 1e15) return false;
    return true;
  }

  roundAmount(val) {
    return Math.round(val * 100) / 100;
  }

  // Parse CHART.DAT - extract account numbers and names
  parseChartDAT(buffer) {
    const accounts = new Map();
    
    // Find the data section (after header pages)
    // Look for ASCII account number patterns
    const accountPattern = /^\d{4,6}(\.\d+)?$/;
    
    // Scan for account number sequences
    for (let i = 0; i < buffer.length - 32; i++) {
      // Check if this looks like start of an account record
      // Account numbers are 16-byte null-padded ASCII strings
      let acctStr = '';
      for (let j = 0; j < 16; j++) {
        const c = buffer[i + j];
        if (c >= 0x30 && c <= 0x39) { // 0-9
          acctStr += String.fromCharCode(c);
        } else if (c === 0x2E) { // .
          acctStr += '.';
        } else if (c === 0x00) { // null terminator
          break;
        } else {
          acctStr = '';
          break;
        }
      }
      
      if (acctStr.length >= 4 && accountPattern.test(acctStr)) {
        // Check what comes before - should be ff ff ff ff or similar pattern
        const prev4 = i >= 4 ? buffer.readUInt32LE(i - 4) : 0;
        
        if (prev4 === 0xFFFFFFFF || prev4 < 0x10000) {
          // This looks like a valid account record
          // The account name should follow later - look for it in nearby strings
          
          if (!accounts.has(acctStr)) {
            accounts.set(acctStr, {
              account_number: acctStr,
              account_name: '', // Will be populated later
              type: this.inferAccountType(acctStr),
              balance: 0,
              balance_source: null
            });
          }
        }
      }
    }
    
    this.log(`Found ${accounts.size} account numbers in CHART.DAT`);
    
    // Now extract account names from the file
    const strings = this.extractStrings(buffer, 3, 60);
    const accountNumbers = Array.from(accounts.keys());
    
    // Match names to accounts
    for (let i = 0; i < strings.length; i++) {
      const s = strings[i].text;
      
      // Check if this is an account number we know
      if (accounts.has(s)) {
        // Look for the name in next few strings
        for (let j = i + 1; j < Math.min(i + 10, strings.length); j++) {
          const name = strings[j].text;
          // Name should contain letters and not be another account number
          if (/[A-Za-z]{2,}/.test(name) && !accountPattern.test(name)) {
            if (!name.toLowerCase().includes('.dat') && name.length >= 3) {
              const acct = accounts.get(s);
              if (!acct.account_name) {
                acct.account_name = name;
              }
              break;
            }
          }
        }
      }
    }
    
    return accounts;
  }

  // Parse CHARTAR.DAT - extract balances using UInt32 account IDs
  parseChartarDAT(buffer, accounts) {
    this.log('Parsing CHARTAR.DAT for balances...');
    
    const balancesFound = new Map();
    
    // Build a map of numeric account IDs to string account numbers
    const numericToString = new Map();
    for (const acctNum of accounts.keys()) {
      // Convert "1000" -> 1000, "1013.1" -> 10131
      const numericId = parseInt(acctNum.replace('.', ''));
      numericToString.set(numericId, acctNum);
    }
    
    this.log(`Looking for ${numericToString.size} account IDs as UInt32`);
    
    // Scan for UInt32 account IDs followed by or preceded by balance doubles
    // Pattern observed: [8-byte double][4-byte acct_id][4-byte padding/index]
    
    for (let i = 8; i < buffer.length - 16; i += 2) {
      try {
        const potentialId = buffer.readUInt32LE(i);
        
        // Check if this is a known account ID
        if (numericToString.has(potentialId)) {
          const acctNum = numericToString.get(potentialId);
          
          // Try to read balance from before this position (8 bytes before)
          const balanceBefore = buffer.readDoubleLE(i - 8);
          
          // Also try reading from after
          const balanceAfter = i + 8 < buffer.length ? buffer.readDoubleLE(i + 4) : NaN;
          
          // Pick the valid one
          let balance = NaN;
          if (this.isValidAmount(balanceBefore)) {
            balance = balanceBefore;
          } else if (this.isValidAmount(balanceAfter)) {
            balance = balanceAfter;
          }
          
          if (!isNaN(balance) && balance !== 0) {
            // Only update if we don't have a balance yet or this is larger
            if (!balancesFound.has(acctNum) || Math.abs(balance) > Math.abs(balancesFound.get(acctNum).balance)) {
              balancesFound.set(acctNum, { balance, offset: i });
            }
          }
        }
      } catch (e) {}
    }
    
    this.log(`Found ${balancesFound.size} account balances from CHARTAR`);
    
    // Update accounts with found balances
    for (const [acctNum, { balance, offset }] of balancesFound) {
      const acct = accounts.get(acctNum);
      if (acct) {
        acct.balance = this.roundAmount(balance);
        acct.balance_source = `CHARTAR@0x${offset.toString(16)}`;
      }
    }
    
    return accounts;
  }
