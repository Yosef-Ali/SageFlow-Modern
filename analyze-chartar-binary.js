/**
 * Deep CHARTAR.DAT Binary Analysis
 * Find the actual structure of the balance records
 */

const fs = require('fs');
const AdmZip = require('adm-zip');

function hexDump(buffer, start, length) {
  const end = Math.min(start + length, buffer.length);
  let output = '';
  
  for (let i = start; i < end; i += 16) {
    const hex = [];
    const ascii = [];
    
    for (let j = 0; j < 16 && i + j < end; j++) {
      const byte = buffer[i + j];
      hex.push(byte.toString(16).padStart(2, '0'));
      ascii.push(byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.');
    }
    
    output += `${i.toString(16).padStart(6, '0')}: ${hex.join(' ').padEnd(48)} ${ascii.join('')}\n`;
  }
  
  return output;
}

function findAllDoubles(buffer) {
  const validAmounts = [];
  
  for (let i = 0; i < buffer.length - 8; i += 4) {
    try {
      const val = buffer.readDoubleLE(i);
      if (Number.isFinite(val) && Math.abs(val) > 0.01 && Math.abs(val) < 1e12) {
        validAmounts.push({ offset: i, value: val });
      }
    } catch {}
  }
  
  return validAmounts;
}

function analyzeFileStructure(buffer, fileName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${fileName}`);
  console.log(`Size: ${buffer.length} bytes`);
  console.log('='.repeat(60));
  
  // Show header
  console.log('\n--- File Header (first 512 bytes) ---');
  console.log(hexDump(buffer, 0, 512));
  
  // Try to identify record structure
  // Btrieve files typically have:
  // - Page size at offset 0x08 (2 bytes)
  // - Record count at offset 0x04 (4 bytes)
  // - Record length at offset 0x0C (2 bytes)
  
  const pageSize = buffer.readUInt16LE(0x08);
  const recordCount = buffer.readUInt32LE(0x04);
  const recordLength = buffer.readUInt16LE(0x0C);
  
  console.log(`\n--- Btrieve Header Info ---`);
  console.log(`Page size: ${pageSize}`);
  console.log(`Record count: ${recordCount}`);
  console.log(`Record length: ${recordLength}`);
  
  // Find all valid monetary amounts
  const amounts = findAllDoubles(buffer);
  console.log(`\n--- Found ${amounts.length} potential monetary values ---`);
  
  // Group by similar values to find patterns
  const valueGroups = new Map();
  for (const a of amounts) {
    const roundedVal = Math.round(a.value * 100) / 100;
    if (!valueGroups.has(roundedVal)) {
      valueGroups.set(roundedVal, []);
    }
    valueGroups.get(roundedVal).push(a.offset);
  }
  
  // Show top unique values
  const uniqueValues = [...valueGroups.entries()]
    .sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]))
    .slice(0, 30);
  
  console.log('\nTop 30 unique monetary values found:');
  for (const [val, offsets] of uniqueValues) {
    console.log(`  ${val.toFixed(2).padStart(15)} found at ${offsets.length} offsets, first: 0x${offsets[0].toString(16)}`);
  }
  
  // Analyze first few data pages for record structure
  const dataStart = pageSize || 4096;
  console.log(`\n--- First data page (starting at offset 0x${dataStart.toString(16)}) ---`);
  console.log(hexDump(buffer, dataStart, 512));
  
  // Look for account number patterns in CHARTAR
  // Peachtree may store account IDs as integers or differently encoded
  console.log('\n--- Looking for account ID patterns ---');
  
  // Search for known account numbers from the extracted list
  const knownAccounts = ['1000', '1010', '1013', '1015', '1100', '2300', '3910', '4000', '5000', '6000'];
  
  for (const acct of knownAccounts) {
    // Search as ASCII string
    const searchBuf = Buffer.from(acct);
    let idx = buffer.indexOf(searchBuf);
    if (idx !== -1) {
      console.log(`\nFound "${acct}" as ASCII at offset 0x${idx.toString(16)}`);
      console.log(hexDump(buffer, Math.max(0, idx - 16), 256));
    }
    
    // Search as integer
    const intVal = parseInt(acct);
    for (let i = 0; i < buffer.length - 4; i += 4) {
      if (buffer.readUInt32LE(i) === intVal) {
        console.log(`\nFound ${acct} as UInt32 at offset 0x${i.toString(16)}`);
        console.log(hexDump(buffer, Math.max(0, i - 16), 128));
        break;
      }
    }
  }
  
  // Calculate record boundaries based on record length
  if (recordLength > 0 && recordLength < 2048) {
    console.log(`\n--- Analyzing first 5 records (record length: ${recordLength}) ---`);
    for (let r = 0; r < 5 && (dataStart + r * recordLength) < buffer.length; r++) {
      const recordStart = dataStart + r * recordLength;
      console.log(`\nRecord ${r} at offset 0x${recordStart.toString(16)}:`);
      console.log(hexDump(buffer, recordStart, Math.min(recordLength, 256)));
      
      // Look for doubles in this record
      for (let off = 0; off < recordLength - 8; off += 8) {
        try {
          const val = buffer.readDoubleLE(recordStart + off);
          if (Number.isFinite(val) && Math.abs(val) > 0.01 && Math.abs(val) < 1e12) {
            console.log(`  Offset +${off}: ${val.toFixed(2)}`);
          }
        } catch {}
      }
    }
  }
}

// Main
const ptbPath = './SWK 2018-011026.ptb';
const zip = new AdmZip(ptbPath);
const entries = zip.getEntries();

// Analyze CHARTAR.DAT
const chartarEntry = entries.find(e => e.entryName.toUpperCase().includes('CHARTAR.DAT'));
if (chartarEntry) {
  analyzeFileStructure(chartarEntry.getData(), 'CHARTAR.DAT');
}

// Also analyze CHART.DAT for comparison
const chartEntry = entries.find(e => e.entryName.toUpperCase() === 'CHART.DAT' || e.entryName.toUpperCase().endsWith('/CHART.DAT'));
if (chartEntry) {
  analyzeFileStructure(chartEntry.getData(), 'CHART.DAT');
}

console.log('\n' + '='.repeat(60));
console.log('Analysis Complete');
console.log('='.repeat(60));
