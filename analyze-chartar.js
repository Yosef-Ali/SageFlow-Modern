/**
 * Deep analysis of CHARTAR.DAT binary structure
 */

const fs = require('fs');
const AdmZip = require('adm-zip');

async function analyzeChartar() {
  const ptbPath = './SWK 2018-011026.ptb';
  const zip = new AdmZip(ptbPath);
  
  const chartarEntry = zip.getEntries().find(e => e.entryName.toUpperCase().includes('CHARTAR.DAT'));
  if (!chartarEntry) {
    console.log('CHARTAR.DAT not found');
    return;
  }
  
  const buffer = chartarEntry.getData();
  console.log(`CHARTAR.DAT size: ${buffer.length} bytes`);
  
  // Find all potential balance values (doubles)
  console.log('\n=== SCANNING FOR DOUBLE VALUES ===');
  const doubles = [];
  for (let i = 0; i < buffer.length - 8; i++) {
    try {
      const val = buffer.readDoubleLE(i);
      // Look for reasonable monetary values
      if (val === val && Math.abs(val) > 100 && Math.abs(val) < 1e9 && val !== 0) {
        // Check if this looks like a balance (not random noise)
        const intPart = Math.floor(Math.abs(val));
        const decPart = Math.abs(val) - intPart;
        // Monetary values usually have 0, 1, or 2 decimal places
        if (decPart < 0.005 || (decPart * 100) % 1 < 0.001) {
          doubles.push({ offset: i, value: val });
        }
      }
    } catch {}
  }
  
  console.log(`Found ${doubles.length} potential balance values`);
  console.log('\nTop 20 largest values:');
  doubles.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  doubles.slice(0, 20).forEach(d => {
    console.log(`  Offset ${d.offset.toString().padStart(8)}: ${d.value.toLocaleString()}`);
  });
  
  // Look for patterns around the largest values
  console.log('\n=== ANALYZING CONTEXT AROUND LARGE VALUES ===');
  doubles.slice(0, 5).forEach(d => {
    const start = Math.max(0, d.offset - 50);
    const end = Math.min(buffer.length, d.offset + 20);
    const context = buffer.slice(start, end);
    
    console.log(`\nValue: ${d.value.toLocaleString()} at offset ${d.offset}`);
    console.log('Preceding bytes (hex):', buffer.slice(d.offset - 20, d.offset).toString('hex'));
    console.log('Value bytes (hex):', buffer.slice(d.offset, d.offset + 8).toString('hex'));
    
    // Look for ASCII strings nearby
    let str = '';
    for (let i = 0; i < context.length; i++) {
      const byte = context[i];
      if (byte >= 32 && byte < 127) {
        str += String.fromCharCode(byte);
      } else if (str.length > 3) {
        console.log(`  Text found: "${str}"`);
        str = '';
      } else {
        str = '';
      }
    }
  });
  
  // Search for known account numbers
  console.log('\n=== SEARCHING FOR KNOWN ACCOUNT NUMBERS ===');
  const knownAccounts = ['1010', '1011', '1012', '1013', '1100', '2300', '3910', '4000', '5000', '6000'];
  
  for (const acct of knownAccounts) {
    const acctBuffer = Buffer.from(acct);
    let found = 0;
    let searchStart = 0;
    
    while (searchStart < buffer.length) {
      const idx = buffer.indexOf(acctBuffer, searchStart);
      if (idx === -1) break;
      found++;
      
      if (found <= 3) {
        // Check for double values nearby
        console.log(`\nAccount ${acct} found at offset ${idx}`);
        
        // Look for doubles in next 100 bytes
        for (let k = idx; k < Math.min(idx + 100, buffer.length - 8); k++) {
          try {
            const val = buffer.readDoubleLE(k);
            if (val === val && Math.abs(val) > 100 && Math.abs(val) < 1e9) {
              console.log(`  Potential balance at +${k - idx}: ${val.toLocaleString()}`);
            }
          } catch {}
        }
      }
      
      searchStart = idx + 1;
    }
    
    if (found > 0) {
      console.log(`  (${acct} appears ${found} times in file)`);
    }
  }
  
  // Analyze record structure
  console.log('\n=== ANALYZING RECORD STRUCTURE ===');
  
  // Look for repeating patterns that might indicate record boundaries
  const pageSize = buffer.readUInt16LE(0x08);
  const recordLen = buffer.readUInt16LE(0x0C);
  console.log(`Possible page size: ${pageSize}`);
  console.log(`Possible record length: ${recordLen}`);
  
  // Dump first 512 bytes as hex
  console.log('\nFirst 256 bytes (header):');
  for (let i = 0; i < 256; i += 32) {
    const line = buffer.slice(i, i + 32);
    const hex = line.toString('hex').match(/.{1,2}/g).join(' ');
    const ascii = Array.from(line).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('');
    console.log(`${i.toString(16).padStart(4, '0')}: ${hex}  |${ascii}|`);
  }
}

analyzeChartar().catch(console.error);
