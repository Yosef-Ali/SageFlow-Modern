// Analyze CHARTAR.DAT to find balance positions
const fs = require('fs');
const path = require('path');

const chartarPath = '/tmp/ptb_analysis/CHARTAR.DAT';
const chartPath = '/tmp/ptb_analysis/CHART.DAT';

// Read files
const chartar = fs.readFileSync(chartarPath);
const chart = fs.readFileSync(chartPath);

console.log('CHARTAR.DAT size:', chartar.length);
console.log('CHART.DAT size:', chart.length);

// Find all double values that look like monetary amounts
function findDoubles(buffer, startOffset = 0) {
  const values = [];
  for (let i = startOffset; i < buffer.length - 8; i += 8) {
    try {
      const val = buffer.readDoubleLE(i);
      if (Number.isFinite(val) && Math.abs(val) >= 1 && Math.abs(val) < 1e12) {
        // Round to check if it looks like money
        const rounded = Math.round(val * 100) / 100;
        if (rounded === val || Math.abs(rounded - val) < 0.001) {
          values.push({ offset: i, value: val });
        }
      }
    } catch {}
  }
  return values;
}

// Find doubles in CHARTAR
console.log('\n=== Scanning CHARTAR.DAT for monetary values ===');
const chartarDoubles = findDoubles(chartar, 16384); // Skip first 16KB header
console.log(`Found ${chartarDoubles.length} potential monetary values`);

// Show first 50
chartarDoubles.slice(0, 50).forEach(d => {
  console.log(`  Offset 0x${d.offset.toString(16).padStart(6, '0')}: ${d.value.toLocaleString()}`);
});

// Look for account pattern in CHART.DAT
console.log('\n=== Finding account records in CHART.DAT ===');
const accountPattern = /\d{4}/;
let count = 0;

for (let i = 0x8000; i < chart.length - 100; i++) {
  // Look for potential account record start
  const str = chart.slice(i, i + 10).toString('ascii').replace(/[^\x20-\x7E]/g, '');
  if (accountPattern.test(str) && str.length >= 4) {
    const acctNum = str.match(/\d{4,6}/)?.[0];
    if (acctNum && count < 20) {
      console.log(`  Offset 0x${i.toString(16)}: Account ${acctNum}`);
      
      // Check for doubles nearby
      for (let j = 0; j < 200; j += 8) {
        if (i + j + 8 > chart.length) break;
        try {
          const val = chart.readDoubleLE(i + j);
          if (Number.isFinite(val) && Math.abs(val) >= 1 && Math.abs(val) < 1e10) {
            console.log(`    Offset +${j}: ${val}`);
          }
        } catch {}
      }
      count++;
    }
  }
}
