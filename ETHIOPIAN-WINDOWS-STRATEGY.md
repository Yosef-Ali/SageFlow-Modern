# 🇪🇹 SAGEFLOW - ETHIOPIAN CUSTOMS OFFICE STRATEGY

## 🎯 Critical Context

**Target Market:** Ethiopian Customs Office + Businesses
**Platform:** Windows ONLY (Mac is just for development)
**Key Requirement:** Peachtree PTB file compatibility
**Why:** Ethiopian customs/businesses use Peachtree Complete Accounting

---

## ✅ REVISED STRATEGY

### ❌ **What We DON'T Need:**
- Mac web app for users (Mac is dev-only)
- Cross-platform support
- SaaS deployment
- Mobile app

### ✅ **What We DO Need:**
- **Windows Desktop App** (Electron)
- **PTB File Import** (direct Peachtree integration)
- **Ethiopian customization** (Amharic support, ETB currency, etc.)
- **Offline-first** (unreliable internet in some areas)

---

## 🎯 THE SOLUTION: PTB FILE PARSER

Since your target is **Windows-only** and **Ethiopian customs offices**, here's the perfect approach:

### **Why PTB Parser is Best for You:**

1. ✅ **No ODBC conflicts** (pure JavaScript, works in Electron)
2. ✅ **One-click import** (drag & drop PTB file)
3. ✅ **Offline compatible** (no internet needed)
4. ✅ **You already have a sample:** `SWK 2018-011026.ptb`
5. ✅ **Ethiopian businesses familiar with PTB files**

### **Architecture (Windows Only):**
```
┌────────────────────────────────┐
│  SageFlow Desktop (Windows)    │
│  - Electron wrapper             │
│  - Built with Next.js 16        │
│  - PTB file parser (JS)         │
└────────────┬───────────────────┘
             │
      ┌──────▼────────┐
      │  Supabase     │ ← Cloud or Local PostgreSQL
      │  PostgreSQL   │
      └───────────────┘

┌────────────────────────────────┐
│  Peachtree Company File        │
│  SWK 2018-011026.ptb          │ → Import to SageFlow
└────────────────────────────────┘
```

---

## 🔧 IMPLEMENTATION PLAN

### **Phase 1: Analyze Your PTB File** (1-2 days)

You already have: `SWK 2018-011026.ptb` in your project!

**Step 1: Extract PTB structure**
```bash
# Install hex viewer
npm install -g hexyl

# Analyze file structure
hexyl SWK\ 2018-011026.ptb | head -100

# Extract text strings
strings SWK\ 2018-011026.ptb > ptb-strings.txt
```

**Step 2: Identify data sections**
```typescript
// Quick analysis script
import fs from 'fs';

const buffer = fs.readFileSync('SWK 2018-011026.ptb');

// Look for table markers
const markers = ['CUST', 'VEND', 'INVOI', 'ITEM'];
markers.forEach(marker => {
  const offset = buffer.indexOf(marker);
  console.log(`${marker} found at offset: ${offset}`);
});

// Analyze record structure
console.log('File size:', buffer.length);
console.log('Header (first 100 bytes):', buffer.slice(0, 100));
```

---

### **Phase 2: Build PTB Parser** (1 week)

**File: `src/lib/peachtree/ptb-parser.ts`**

```typescript
import fs from 'fs';
import path from 'path';

export class PeachtreeParser {
  private buffer: Buffer;
  private encoding: string = 'utf-8'; // or 'windows-1252' for older files
  
  constructor(filePath: string) {
    this.buffer = fs.readFileSync(filePath);
  }

  /**
   * Parse PTB file header
   */
  parseHeader() {
    // PTB files typically start with:
    // - File signature (4-8 bytes)
    // - Version number (2 bytes)
    // - Company name offset (4 bytes)
    
    const signature = this.buffer.slice(0, 4).toString('ascii');
    const version = this.buffer.readUInt16LE(4);
    
    return {
      signature,
      version,
      isValid: signature.includes('P') // Peachtree marker
    };
  }

  /**
   * Find data table by marker
   */
  findTable(marker: string): number {
    const markerBuffer = Buffer.from(marker, 'ascii');
    return this.buffer.indexOf(markerBuffer);
  }

  /**
   * Parse customer records
   */
  parseCustomers() {
    const offset = this.findTable('CUST');
    if (offset === -1) return [];
    
    const customers = [];
    let currentOffset = offset + 4; // Skip marker
    
    // Read record count (usually 2 bytes)
    const recordCount = this.buffer.readUInt16LE(currentOffset);
    currentOffset += 2;
    
    for (let i = 0; i < recordCount; i++) {
      const customer = this.parseCustomerRecord(currentOffset);
      customers.push(customer);
      currentOffset += customer._recordSize; // Move to next record
    }
    
    return customers;
  }

  /**
   * Parse single customer record
   * Note: Field sizes are estimated - adjust based on your PTB analysis
   */
  parseCustomerRecord(offset: number) {
    let pos = offset;
    
    const customer = {
      customerId: this.readFixedString(pos, 10).trim(),
      name: this.readFixedString(pos + 10, 40).trim(),
      contact: this.readFixedString(pos + 50, 30).trim(),
      address1: this.readFixedString(pos + 80, 40).trim(),
      address2: this.readFixedString(pos + 120, 40).trim(),
      city: this.readFixedString(pos + 160, 20).trim(),
      state: this.readFixedString(pos + 180, 10).trim(),
      zip: this.readFixedString(pos + 190, 10).trim(),
      phone: this.readFixedString(pos + 200, 15).trim(),
      email: this.readFixedString(pos + 215, 50).trim(),
      
      // Ethiopian specific fields might be here
      tinNumber: this.readFixedString(pos + 265, 20).trim(), // TIN
      
      _recordSize: 300 // Total record size (adjust after analysis)
    };
    
    return customer;
  }

  /**
   * Parse invoice records
   */
  parseInvoices() {
    const offset = this.findTable('INVO');
    if (offset === -1) return [];
    
    // Similar structure to customers
    // ... implement based on PTB analysis
  }

  /**
   * Helper: Read fixed-length string
   */
  private readFixedString(offset: number, length: number): string {
    return this.buffer
      .slice(offset, offset + length)
      .toString(this.encoding)
      .replace(/\0/g, '') // Remove null terminators
      .trim();
  }

  /**
   * Helper: Read decimal number (Peachtree uses specific format)
   */
  private readDecimal(offset: number): number {
    // Peachtree often stores decimals as integers * 100
    const value = this.buffer.readInt32LE(offset);
    return value / 100;
  }

  /**
   * Complete import
   */
  parseAll() {
    return {
      header: this.parseHeader(),
      customers: this.parseCustomers(),
      vendors: this.parseVendors(),
      invoices: this.parseInvoices(),
      items: this.parseItems(),
      chartOfAccounts: this.parseAccounts()
    };
  }
}
```

---

### **Phase 3: Import to SageFlow** (2 days)

**File: `src/app/actions/ptb-import-actions.ts`**

```typescript
'use server';

import { PeachtreeParser } from '@/lib/peachtree/ptb-parser';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function importPTBFile(filePath: string) {
  try {
    // Parse PTB file
    const parser = new PeachtreeParser(filePath);
    const data = parser.parseAll();
    
    // Validate
    if (!data.header.isValid) {
      throw new Error('Invalid PTB file format');
    }
    
    // Import customers
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .insert(data.customers.map(c => ({
        customer_id: c.customerId,
        name: c.name,
        contact_name: c.contact,
        email: c.email,
        phone: c.phone,
        address: {
          street: c.address1,
          street2: c.address2,
          city: c.city,
          state: c.state,
          zip: c.zip
        },
        tin_number: c.tinNumber // Ethiopian TIN
      })));
    
    if (custError) throw custError;
    
    // Import invoices
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .insert(data.invoices.map(mapInvoice));
    
    if (invError) throw invError;
    
    return {
      success: true,
      summary: {
        customers: customers?.length || 0,
        vendors: data.vendors.length,
        invoices: invoices?.length || 0,
        items: data.items.length
      }
    };
  } catch (error) {
    console.error('PTB import failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

### **Phase 4: UI Component** (1 day)

**File: `src/components/peachtree/ptb-import-dialog.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { importPTBFile } from '@/app/actions/ptb-import-actions';

export function PTBImportDialog() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    
    // Save file temporarily
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempPath = `/tmp/${file.name}`;
    fs.writeFileSync(tempPath, buffer);
    
    // Import
    const result = await importPTBFile(tempPath);
    setResult(result);
    setImporting(false);
    
    // Clean up
    fs.unlinkSync(tempPath);
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <h2>Import from Peachtree</h2>
          <p>Select your Peachtree company file (.PTB)</p>
        </DialogHeader>
        
        <div className="space-y-4">
          <input
            type="file"
            accept=".ptb"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="file-input"
          />
          
          {file && (
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-600">
                Size: {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
          
          <Button
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? 'Importing...' : 'Import Data'}
          </Button>
          
          {result && result.success && (
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-bold text-green-800">Import Successful!</h3>
              <ul className="mt-2 space-y-1">
                <li>✅ {result.summary.customers} customers</li>
                <li>✅ {result.summary.vendors} vendors</li>
                <li>✅ {result.summary.invoices} invoices</li>
                <li>✅ {result.summary.items} items</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🇪🇹 ETHIOPIAN CUSTOMIZATION

### **Key Features for Ethiopian Market:**

**1. Currency & Number Formatting**
```typescript
// src/lib/ethiopian-formats.ts

export const ETB_CURRENCY = {
  code: 'ETB',
  symbol: 'ብር', // Birr symbol
  decimal: 2
};

export function formatETB(amount: number): string {
  return `ብር ${amount.toLocaleString('am-ET', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
```

**2. Ethiopian Calendar Support**
```typescript
// Add Ethiopian calendar dates alongside Gregorian
import { EthiopianCalendar } from 'ethiopian-calendar';

export function showDualDate(gregorianDate: Date) {
  const ethiopian = EthiopianCalendar.fromGregorian(gregorianDate);
  return {
    gregorian: gregorianDate.toLocaleDateString('en-US'),
    ethiopian: `${ethiopian.day}/${ethiopian.month}/${ethiopian.year}`
  };
}
```

**3. TIN (Tax Identification Number) Field**
```typescript
// Already in schema
customers: {
  tin_number: string; // Ethiopian TIN format
  vat_registered: boolean;
}
```

**4. Amharic Language Support**
```typescript
// src/i18n/am.ts (Amharic translations)

export const am = {
  common: {
    customer: 'ደንበኛ',
    invoice: 'ደረሰኝ',
    payment: 'ክፍያ',
    total: 'ድምር'
  },
  actions: {
    import: 'ከፔችትሪ አስመጣ',
    export: 'ወደ ፔችትሪ ላክ',
    save: 'አስቀምጥ'
  }
};
```

---

## 📊 WINDOWS-SPECIFIC OPTIMIZATIONS

### **1. Installer with PTB Association**

```yaml
# electron-builder.yml
win:
  target:
    - nsis
  fileAssociations:
    - ext: ptb
      name: Peachtree Company File
      description: Import to SageFlow
      icon: assets/ptb-icon.ico
```

**Result:** Double-click `.ptb` file → Opens in SageFlow!

### **2. Windows Registry Integration**

```typescript
// Auto-detect Peachtree installation
import { exec } from 'child_process';

function findPeachtreeInstallation() {
  return new Promise((resolve) => {
    exec('reg query "HKLM\\SOFTWARE\\Peachtree"', (error, stdout) => {
      if (error) resolve(null);
      else {
        const path = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/)?.[1];
        resolve(path);
      }
    });
  });
}
```

### **3. Offline Database Option**

```typescript
// For areas with poor internet
export async function useLocalDB() {
  const { Pool } = require('pg');
  
  // Local PostgreSQL on Windows
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'sageflow',
    user: 'sageflow',
    password: process.env.LOCAL_DB_PASSWORD
  });
  
  return pool;
}
```

---

## 🎯 REVISED TIMELINE

### **Week 1: PTB Analysis**
- [ ] Analyze `SWK 2018-011026.ptb` structure
- [ ] Document field offsets and sizes
- [ ] Identify all data tables
- [ ] Test parsing logic

### **Week 2: Build Parser**
- [ ] Implement PTB parser class
- [ ] Add customer parsing
- [ ] Add invoice parsing
- [ ] Add vendor/items parsing
- [ ] Test with real PTB file

### **Week 3: Integration**
- [ ] Create import actions
- [ ] Build UI component
- [ ] Add progress indicators
- [ ] Ethiopian customization
- [ ] Test end-to-end

### **Week 4: Polish & Ship**
- [ ] Windows installer
- [ ] PTB file association
- [ ] Amharic translations
- [ ] User documentation in Amharic
- [ ] **SHIP TO ETHIOPIAN MARKET! 🇪🇹**

---

## 🚀 IMMEDIATE NEXT STEPS

### **1. Analyze Your PTB File (Today!)**

```bash
cd /Users/mekdesyared/SageFlow-Modern

# Look at the file
ls -lh "SWK 2018-011026.ptb"

# Extract structure (install hexyl first if needed)
brew install hexyl
hexyl "SWK 2018-011026.ptb" | head -200 > ptb-analysis.txt

# Extract strings
strings "SWK 2018-011026.ptb" > ptb-strings.txt

# Analyze
cat ptb-strings.txt | grep -i customer
cat ptb-strings.txt | grep -i invoice
```

### **2. Document What You Find**

Create: `PTB-FILE-STRUCTURE.md`
```markdown
# PTB File Structure Analysis

## File: SWK 2018-011026.ptb

### Header (Bytes 0-100):
- Signature: [found bytes]
- Version: [number]

### Customer Table:
- Offset: [byte position]
- Record Size: [bytes]
- Fields:
  - Customer ID: offset X, length Y
  - Name: offset X, length Y
  ...
```

### **3. Build Quick Prototype**

```bash
# Create test script
touch src/scripts/test-ptb-parse.ts
```

```typescript
// src/scripts/test-ptb-parse.ts
import fs from 'fs';

const buffer = fs.readFileSync('SWK 2018-011026.ptb');

console.log('File size:', buffer.length);
console.log('First 100 bytes:', buffer.slice(0, 100));

// Look for "CUST" marker
const custMarker = buffer.indexOf('CUST');
console.log('CUST table at:', custMarker);

// Try to read first customer
if (custMarker > 0) {
  const nameOffset = custMarker + 10; // Adjust based on analysis
  const name = buffer.slice(nameOffset, nameOffset + 40).toString('utf-8');
  console.log('First customer name:', name);
}
```

Run: `tsx src/scripts/test-ptb-parse.ts`

---

## 🎉 BOTTOM LINE FOR ETHIOPIAN MARKET

### ✅ **Perfect Strategy:**
1. **Windows Desktop App** (Electron)
2. **PTB File Parser** (no ODBC needed!)
3. **Ethiopian Customization** (Amharic, ETB, TIN)
4. **Offline-First** (local PostgreSQL option)

### ✅ **Why This Works:**
- No ODBC conflicts (pure JavaScript parser)
- Works offline (important in Ethiopia)
- Familiar workflow (drop PTB file)
- Ethiopian government-ready (TIN, VAT, Amharic)

### ✅ **Time to Market:**
- **3-4 weeks** to build PTB parser
- **Perfect for Ethiopian customs office**
- **Unique competitive advantage**

---

**Start analyzing that PTB file TODAY! That's your golden ticket to the Ethiopian market! 🇪🇹🚀**

