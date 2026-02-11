const fs = require('fs');
const AdmZip = require('adm-zip');

const buf = fs.readFileSync('/Users/mekdesyared/SageFlow-Modern/SWK 2018-011026.ptb');
const zip = new AdmZip(buf);

function readBtrieveFile(entryName) {
  const entry = zip.getEntry(entryName);
  if (!entry) return null;
  return entry.getData();
}

function getFileInfo(data) {
  /* Btrieve 6.x File Control Record (page 0) */
  const recLen = data.readUInt16LE(0x16);
  const numRecs = data.readUInt32LE(0x18);
  /* Page size: stored at offset 0x08. If 0, derive from file factors. */
  let pageSize = data.readUInt16LE(0x08);
  if (pageSize === 0 || pageSize < 512) {
    /* Try common sizes */
    for (const ps of [4096, 2048, 1024, 512]) {
      if (data.length >= ps * 2 && data.length % ps === 0) {
        pageSize = ps;
        break;
      }
    }
    if (pageSize === 0 || pageSize < 512) pageSize = 4096;
  }
  return { recLen, numRecs, pageSize };
}

function extractRecords(data, recLen, pageSize, maxRecords) {
  const records = [];
  const totalPages = Math.floor(data.length / pageSize);

  for (let pn = 1; pn < totalPages && records.length < maxRecords; pn++) {
    const pageOff = pn * pageSize;
    if (pageOff + 6 > data.length) break;

    /* Btrieve page header: bytes 0-3 are pointers, bytes 4-5 may be slot count */
    /* Try multiple header sizes (4, 6, 8) */
    const dataAreaStart = pageOff + 6;
    const dataAreaSize = pageSize - 6;
    const slotsInPage = Math.floor(dataAreaSize / recLen);

    for (let s = 0; s < slotsInPage && records.length < maxRecords; s++) {
      const recOff = dataAreaStart + (s * recLen);
      if (recOff + recLen > data.length) break;

      const recBuf = data.slice(recOff, recOff + recLen);

      /* Check if record is empty/deleted (all zeros or all 0xFF) */
      let allZero = true;
      let allFF = true;
      for (let b = 0; b < Math.min(recLen, 20); b++) {
        if (recBuf[b] !== 0) allZero = false;
        if (recBuf[b] !== 0xFF) allFF = false;
      }
      if (allZero || allFF) continue;

      records.push(recBuf);
    }
  }
  return records;
}

function showHex(buffer, offset, length) {
  const slice = buffer.slice(offset, offset + length);
  let hex = '';
  let ascii = '';
  for (let i = 0; i < slice.length; i++) {
    hex += slice[i].toString(16).padStart(2, '0') + ' ';
    ascii += (slice[i] >= 32 && slice[i] <= 126) ? String.fromCharCode(slice[i]) : '.';
  }
  return hex.trim() + '  |' + ascii + '|';
}

/* Analyze CUSTOMER.DAT */
console.log('=== CUSTOMER.DAT ===');
const custData = readBtrieveFile('CUSTOMER.DAT');
if (custData) {
  const info = getFileInfo(custData);
  console.log('RecLen:', info.recLen, 'NumRecs:', info.numRecs, 'PageSize:', info.pageSize);

  const records = extractRecords(custData, info.recLen, info.pageSize, 10);
  console.log('Extracted', records.length, 'records');

  for (let i = 0; i < Math.min(records.length, 3); i++) {
    console.log('\nRecord ' + i + ' (first 200 bytes):');
    const rec = records[i];
    for (let off = 0; off < Math.min(rec.length, 200); off += 32) {
      const end = Math.min(off + 32, rec.length);
      console.log('  ' + String(off).padStart(4) + ': ' + showHex(rec, off, end - off));
    }
  }
}

/* Analyze CHART.DAT */
console.log('\n=== CHART.DAT ===');
const chartData = readBtrieveFile('CHART.DAT');
if (chartData) {
  const info = getFileInfo(chartData);
  console.log('RecLen:', info.recLen, 'NumRecs:', info.numRecs, 'PageSize:', info.pageSize);

  const records = extractRecords(chartData, info.recLen, info.pageSize, 10);
  console.log('Extracted', records.length, 'records');

  for (let i = 0; i < Math.min(records.length, 3); i++) {
    console.log('\nRecord ' + i + ' (first 200 bytes):');
    const rec = records[i];
    for (let off = 0; off < Math.min(rec.length, 200); off += 32) {
      const end = Math.min(off + 32, rec.length);
      console.log('  ' + String(off).padStart(4) + ': ' + showHex(rec, off, end - off));
    }
  }
}

/* Analyze VENDOR.DAT */
console.log('\n=== VENDOR.DAT ===');
const vendData = readBtrieveFile('VENDOR.DAT');
if (vendData) {
  const info = getFileInfo(vendData);
  console.log('RecLen:', info.recLen, 'NumRecs:', info.numRecs, 'PageSize:', info.pageSize);

  const records = extractRecords(vendData, info.recLen, info.pageSize, 10);
  console.log('Extracted', records.length, 'records');

  for (let i = 0; i < Math.min(records.length, 3); i++) {
    console.log('\nRecord ' + i + ' (first 200 bytes):');
    const rec = records[i];
    for (let off = 0; off < Math.min(rec.length, 200); off += 32) {
      const end = Math.min(off + 32, rec.length);
      console.log('  ' + String(off).padStart(4) + ': ' + showHex(rec, off, end - off));
    }
  }
}

/* Analyze COMPANY.DAT */
console.log('\n=== COMPANY.DAT ===');
const compData = readBtrieveFile('COMPANY.DAT');
if (compData) {
  const info = getFileInfo(compData);
  console.log('RecLen:', info.recLen, 'NumRecs:', info.numRecs, 'PageSize:', info.pageSize);

  const records = extractRecords(compData, info.recLen, info.pageSize, 5);
  console.log('Extracted', records.length, 'records');

  for (let i = 0; i < Math.min(records.length, 2); i++) {
    console.log('\nRecord ' + i + ' (first 300 bytes):');
    const rec = records[i];
    for (let off = 0; off < Math.min(rec.length, 300); off += 32) {
      const end = Math.min(off + 32, rec.length);
      console.log('  ' + String(off).padStart(4) + ': ' + showHex(rec, off, end - off));
    }
  }
}

/* Analyze JRNLHDR.DAT */
console.log('\n=== JRNLHDR.DAT ===');
const jrnlData = readBtrieveFile('JRNLHDR.DAT');
if (jrnlData) {
  const info = getFileInfo(jrnlData);
  console.log('RecLen:', info.recLen, 'NumRecs:', info.numRecs, 'PageSize:', info.pageSize);

  const records = extractRecords(jrnlData, info.recLen, info.pageSize, 5);
  console.log('Extracted', records.length, 'records');

  for (let i = 0; i < Math.min(records.length, 2); i++) {
    console.log('\nRecord ' + i + ' (first 200 bytes):');
    const rec = records[i];
    for (let off = 0; off < Math.min(rec.length, 200); off += 32) {
      const end = Math.min(off + 32, rec.length);
      console.log('  ' + String(off).padStart(4) + ': ' + showHex(rec, off, end - off));
    }
  }
}

/* Analyze JRNLROW.DAT */
console.log('\n=== JRNLROW.DAT ===');
const jrnlRowData = readBtrieveFile('JRNLROW.DAT');
if (jrnlRowData) {
  const info = getFileInfo(jrnlRowData);
  console.log('RecLen:', info.recLen, 'NumRecs:', info.numRecs, 'PageSize:', info.pageSize);

  const records = extractRecords(jrnlRowData, info.recLen, info.pageSize, 5);
  console.log('Extracted', records.length, 'records');

  for (let i = 0; i < Math.min(records.length, 2); i++) {
    console.log('\nRecord ' + i + ' (first 200 bytes):');
    const rec = records[i];
    for (let off = 0; off < Math.min(rec.length, 200); off += 32) {
      const end = Math.min(off + 32, rec.length);
      console.log('  ' + String(off).padStart(4) + ': ' + showHex(rec, off, end - off));
    }
  }
}
