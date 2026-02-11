
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PTB_PATH = path.resolve(__dirname, '../SWK 2018-011026.ptb');

async function analyze() {
  console.log(`Analyzing PTB: ${PTB_PATH}`);

  if (!fs.existsSync(PTB_PATH)) {
    console.error('❌ PTB file not found at:', PTB_PATH);
    process.exit(1);
  }

  const data = fs.readFileSync(PTB_PATH);
  const zip = await JSZip.loadAsync(data);

  const files = Object.keys(zip.files);
  console.log(`Found ${files.length} files in archive.`);

  // 1. Identify Vendor Files
  const vendorFiles = files.filter(f => /VEND|SUPPLIER|ADDRESS/i.test(f) && f.endsWith('.DAT'));
  console.log('Potential Vendor Files:', vendorFiles);

  // 2. Scan each potential file
  for (const filename of vendorFiles) {
    console.log(`\n--- Scanning ${filename} ---`);
    const fileData = await zip.files[filename].async('uint8array');

    // Extract strings using similar logic to parser but WITHOUT filtering
    const text = new TextDecoder('latin1').decode(fileData);
    const matches = text.match(/[\x20-\x7E]{3,100}/g) || [];
    const strings = matches.map(m => m.trim()).filter(m => m.length >= 3);

    console.log(`Found ${strings.length} raw strings. First 100:`);
    strings.slice(0, 100).forEach((s, i) => {
      // Check if it passes the current filter (simulated)
      const passes = filterCheck(s);
      console.log(`  [${passes ? 'PASS' : 'FAIL'}] "${s}"`);
    });
  }
}

// Simulated filter check from ptb-parser.ts
function filterCheck(s: string): boolean {
  if (s.length < 3 || s.length > 60) return false;
  if (!/^[A-Z]/.test(s)) return false;
  if (['null', 'true', 'false', 'date', 'time', 'default', 'group'].includes(s.toLowerCase())) return false;
  if (/['"$@\[\]{}\\<>\(\)~]/.test(s)) return false;
  if (s.length <= 5 && /[a-z][A-Z0-9]/.test(s)) return false;
  if (s.length <= 4 && /^[A-Z][a-z][A-Z][a-z]$/.test(s)) return false;
  if (s.length <= 4 && /^[A-Z][a-z]+[A-Z]$/.test(s)) return false;
  if (s.length <= 5 && /[0-9]/.test(s)) return false;
  if (!/[aeiouAEIOU]/.test(s) && !/^[A-Z]{3,6}$/.test(s)) return false;
  if (!/[a-z]/.test(s) && !/^[A-Z\s&\.]+$/.test(s)) return false;
  if (/([^\w\s])\1{2,}/.test(s)) return false;
  if (/^[A-Z]{1,2}$/.test(s)) return false;
  return true;
}

function printHexDump(buffer: Uint8Array, baseOffset: number, highlightOffset: number) {
  for (let i = 0; i < buffer.length; i += 16) {
    const chunk = buffer.slice(i, i + 16);
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');

    const currentOffset = baseOffset + i;
    const marker = (highlightOffset >= currentOffset && highlightOffset < currentOffset + 16) ? '>' : ' ';

    console.log(`${marker} ${currentOffset.toString(16).padStart(6, '0')}  ${hex.padEnd(48)}  ${ascii}`);
  }
}

function scanDoubles(buffer: Uint8Array, baseOffset: number) {
  for (let i = 0; i < buffer.length - 8; i++) {
    const start = i; // relative to buffer
    const globalOffset = baseOffset + i;

    // Read double (little endian)
    const view = new DataView(buffer.buffer, buffer.byteOffset + i, 8);
    const val = view.getFloat64(0, true);

    if (Number.isFinite(val) && Math.abs(val) > 0.01 && Math.abs(val) < 100000000) {
      // Filter out likely integers or garbage usually
      // If it's a "clean" number (like 123.45 or 5000) it's meaningful
      // Or if it matches money-like values
      console.log(`  Offset ${globalOffset}: ${val} (0x${globalOffset.toString(16)})`);
    }
  }
}

analyze().catch(console.error);
