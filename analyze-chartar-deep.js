/**
 * Deep Binary Analysis of CHARTAR.DAT
 * This will help us understand the actual structure
 */

const fs = require('fs');
const path = require('path');
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

function findPatterns(buffer) {
  console.log('\n🔍 Searching for patterns...\n');
  
  // Find all occurrences of "1000" through "9999" (account numbers)
  const accountNumbers = [];
  
  for (let i = 0; i < buffer.length - 10; i++) {
    // Check for ASCII digits
    let str = '';
    for (let j = 0; j < 6; j++) {
      const c = buffer[i + j];
      if (c >= 0x30 && c <= 0x39) {
        str += String.fromCharCode(c);
      } else if (c === 0x2E) {
        str += '.';
      } else {
        break;
      }
    }
    
    if (str.length >= 4 && /^\d{4,6}(\.\d+)?$/.test(str)) {
      // Check what comes before this position
      const prevBytes = [];
      for (let j = 5; j >= 1; j--) {
        if (i - j >= 0) {
          prevBytes.push(buffer[i - j].toString(16).padStart(2, '0'));
        }
      }
      
      accountNumbers.push({
        position: i,
        number: str,
        prevBytes: prevBytes.join(' ')
      });
    }
  }
  
  console.log(`Found ${accountNumbers.length} potential account numbers`);
  
  // Show first 20 unique patterns
  const uniquePatterns = new Map();
  for (const an of accountNumbers) {
    const key = an.prevBytes;
    if (!uniquePatterns.has(key)) {
      uniquePatterns.set(key, an);
    }
  }
  
  console.log(`\nUnique preceding byte patterns: ${uniquePatterns.size}`);
  
  let count = 0;
  for (const [pattern, example] of uniquePatterns) {
    if (count++ > 10) break;
    console.log(`  Pattern: ${pattern} -> "${example.number}" at 0x${example.position.toString(16)}`);
  }
  
  return accountNumbers;
}

function analyzeRecordStructure(buffer, accountPositions) {
  console.log('\n📊 Analyzing record structure...\n');
  
  // Take first 10 account positions and analyze structure
  const samples = accountPositions.slice(0, 10);
  
  for (const sample of samples) {
    console.log(`\n--- Account: ${sample.number} at offset 0x${sample.position.toString(16)} ---`);
    console.log(hexDump(buffer, sample.position - 10, 200));
    
    // Try to find double values
    console.log('Potential balance values:');
    for (let offset = 20; offset < 150; offset += 2) {
      const pos = sample.position + offset;
      if (pos + 8 <= buffer.length) {
        try {
          const val = buffer.readDoubleLE(pos);
          if (Number.isFinite(val) && Math.abs(val) > 0.01 && Math.abs(val) < 1e10) {
            console.log(`  Offset +${offset}: ${val.toFixed(2)}`);
          }
        } catch {}
      }
    }
  }
}

async function main() {
  console.log('\n🔬 CHARTAR.DAT Binary Analysis\n');
  console.log('='.repeat(70));

  const ptbPath = path.join(__dirname, 'SWK 2018-011026.ptb');
  const zip = new AdmZip(ptbPath);
  
  const chartarEntry = zip.getEntries().find(e => 
    e.entryName.toUpperCase().includes('CHARTAR.DAT')
  );
  
  if (!chartarEntry) {
    console.error('CHARTAR.DAT not found');
    return;
  }
  
  const buffer = chartarEntry.getData();
  console.log(`\nLoaded CHARTAR.DAT: ${buffer.length} bytes`);
  
  // Show first 512 bytes (header)
  console.log('\n📄 First 512 bytes (file header):');
  console.log(hexDump(buffer, 0, 512));
  
  // Find patterns
  const accountPositions = findPatterns(buffer);
  
  // Analyze structure
  if (accountPositions.length > 0) {
    analyzeRecordStructure(buffer, accountPositions);
  }
  
  // Also analyze CHART.DAT
  console.log('\n\n' + '='.repeat(70));
  console.log('CHART.DAT Analysis');
  console.log('='.repeat(70));
  
  const chartEntry = zip.getEntries().find(e => 
    e.entryName.toUpperCase() === 'CHART.DAT' || 
    e.entryName.toUpperCase().endsWith('/CHART.DAT')
  );
  
  if (chartEntry) {
    const chartBuffer = chartEntry.getData();
    console.log(`\nLoaded CHART.DAT: ${chartBuffer.length} bytes`);
    
    // Find account patterns in CHART.DAT too
    const chartAccountPositions = findPatterns(chartBuffer);
    
    if (chartAccountPositions.length > 0) {
      analyzeRecordStructure(chartBuffer, chartAccountPositions);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Analysis Complete!\n');
}

main().catch(console.error);
