# 🔄 PEACHTREE COMPATIBILITY GUIDE

## 🎯 The Challenge

**Original Approach (Abandoned):**
```
SageFlow Desktop → ODBC → Peachtree Database
```

**Why It Failed:**
1. ❌ `odbc` npm package uses **native C++ modules**
2. ❌ Native modules conflict with **Electron's V8 engine**
3. ❌ Complex ODBC driver setup on Windows
4. ❌ Can't bundle native modules in Electron app
5. ❌ Maintenance nightmare across OS versions

---

## ✅ RECOMMENDED SOLUTIONS (4 Approaches)

### 🥇 **Option 1: Import/Export via CSV/Excel** ⭐ EASIEST

**How It Works:**
```
Peachtree → Export CSV → SageFlow Import
SageFlow → Export CSV → Peachtree Import
```

**Pros:**
- ✅ No native modules needed
- ✅ Works in both Desktop & Web versions
- ✅ Simple user workflow
- ✅ Zero ODBC complexity
- ✅ Cross-platform compatible

**Cons:**
- ⚠️ Manual process (not automatic)
- ⚠️ No real-time sync
- ⚠️ User must export from Peachtree

**Implementation Status:**
Already started! Found in: `src/app/actions/peachtree-import-export.ts`

**What You Need to Build:**
1. CSV parser for Peachtree export format
2. Data mapping (Peachtree fields → SageFlow fields)
3. Import UI with field mapping
4. Export to Peachtree-compatible CSV format

**Code Example:**
```typescript
// src/lib/peachtree/csv-import.ts

import Papa from 'papaparse';

interface PeachtreeCustomer {
  'Customer ID': string;
  'Customer Name': string;
  'Contact': string;
  'Address Line 1': string;
  'City': string;
  'State': string;
  'Zip': string;
  'Phone': string;
  'Email': string;
  'Terms': string;
}

export async function importPeachtreeCustomersCSV(file: File) {
  return new Promise((resolve, reject) => {
    Papa.parse<PeachtreeCustomer>(file, {
      header: true,
      complete: async (results) => {
        const sageflowCustomers = results.data.map(ptCustomer => ({
          // Map Peachtree fields to SageFlow fields
          customerId: ptCustomer['Customer ID'],
          name: ptCustomer['Customer Name'],
          contactName: ptCustomer['Contact'],
          email: ptCustomer['Email'],
          phone: ptCustomer['Phone'],
          address: {
            street: ptCustomer['Address Line 1'],
            city: ptCustomer['City'],
            state: ptCustomer['State'],
            zip: ptCustomer['Zip']
          },
          paymentTerms: ptCustomer['Terms']
        }));

        // Import to Supabase
        const { data, error } = await supabase
          .from('customers')
          .insert(sageflowCustomers);

        if (error) reject(error);
        else resolve(data);
      },
      error: reject
    });
  });
}

export async function exportToPeachtreeCSV(customers: Customer[]) {
  const peachtreeFormat = customers.map(c => ({
    'Customer ID': c.customerId,
    'Customer Name': c.name,
    'Contact': c.contactName,
    'Address Line 1': c.address.street,
    'City': c.address.city,
    'State': c.address.state,
    'Zip': c.address.zip,
    'Phone': c.phone,
    'Email': c.email,
    'Terms': c.paymentTerms
  }));

  const csv = Papa.unparse(peachtreeFormat);
  return csv;
}
```

**User Workflow:**
1. User exports customers from Peachtree as CSV
2. User clicks "Import from Peachtree" in SageFlow
3. User uploads CSV file
4. SageFlow maps fields and imports data
5. User reviews and confirms import

**Time to Implement:** 1-2 days
**Maintenance:** Low (CSV format is stable)
**User-Friendly:** High (familiar export/import pattern)

---

### 🥈 **Option 2: PTB File Parser** ⭐ BEST INTEGRATION

**How It Works:**
```
Peachtree .PTB File → JavaScript Parser → SageFlow Database
```

**Pros:**
- ✅ No native modules (pure JavaScript)
- ✅ Works in Electron & Web
- ✅ Direct file access
- ✅ Can read complete Peachtree database
- ✅ One-click import experience

**Cons:**
- ⚠️ PTB format is proprietary (reverse engineering needed)
- ⚠️ Complex file structure
- ⚠️ May break with Peachtree updates
- ⚠️ Read-only (can't write back to PTB)

**PTB File Structure:**
```
SWK 2018-011026.ptb (Peachtree Company File)
├── Header (Company info)
├── Customer Table
├── Vendor Table
├── Items Table
├── Chart of Accounts
├── Invoices Table
├── Transactions
└── Footer
```

**Implementation Approach:**

1. **Study PTB Format:**
```typescript
// src/lib/peachtree/ptb-parser.ts

export class PTBParser {
  private buffer: Buffer;
  
  constructor(fileBuffer: Buffer) {
    this.buffer = fileBuffer;
  }

  // Read PTB header to identify version
  readHeader() {
    const signature = this.buffer.slice(0, 8).toString();
    const version = this.buffer.readUInt16LE(8);
    return { signature, version };
  }

  // Locate customer records (offset varies by version)
  findCustomerTable() {
    // PTB uses table markers
    const marker = Buffer.from('CUST', 'ascii');
    const offset = this.buffer.indexOf(marker);
    return offset;
  }

  // Parse customer record
  parseCustomer(offset: number) {
    // Record structure (approximate):
    // 0-10: Customer ID (string)
    // 10-50: Customer Name (string)
    // 50-100: Address (string)
    // ... more fields
    
    return {
      customerId: this.readString(offset, 10),
      name: this.readString(offset + 10, 40),
      address: this.readString(offset + 50, 50),
      // ... parse more fields
    };
  }

  readString(offset: number, length: number): string {
    return this.buffer.slice(offset, offset + length)
      .toString('utf-8')
      .replace(/\0/g, '')
      .trim();
  }
}
```

2. **Use Existing PTB File:**
You have: `SWK 2018-011026.ptb` in your project!
Use this to reverse-engineer the format:

```bash
# Analyze PTB file structure
hexdump -C "SWK 2018-011026.ptb" | head -50

# Look for patterns
strings "SWK 2018-011026.ptb" | grep -i customer
```

3. **Import Workflow:**
```typescript
// Usage in SageFlow
async function importPTB(file: File) {
  const buffer = await file.arrayBuffer();
  const parser = new PTBParser(Buffer.from(buffer));
  
  // Parse sections
  const header = parser.readHeader();
  const customers = parser.parseAllCustomers();
  const vendors = parser.parseAllVendors();
  const invoices = parser.parseAllInvoices();
  
  // Import to Supabase
  await importToSageFlow({ customers, vendors, invoices });
}
```

**Time to Implement:** 1-2 weeks (reverse engineering)
**Maintenance:** Medium (PTB format may change)
**User-Friendly:** Excellent (drag & drop PTB file)

**Resources:**
- Your PTB file: `SWK 2018-011026.ptb`
- Hex editor: https://hexed.it/
- Binary analysis tools
- Peachtree SDK documentation (if available)

---

### 🥉 **Option 3: Separate Sync Utility** ⭐ NO ELECTRON CONFLICTS

**How It Works:**
```
Standalone Node.js App (with ODBC) ← → SageFlow API
     ↓
Peachtree Database
```

**Architecture:**
```
┌─────────────────────┐
│  SageFlow Desktop   │
│  (Electron - No     │ ← Users interact here
│   ODBC conflicts)   │
└──────────┬──────────┘
           │ REST API
┌──────────▼──────────┐
│   Supabase Cloud    │ ← Shared database
└──────────┬──────────┘
           │ API calls
┌──────────▼──────────┐
│  Peachtree Sync     │
│  Service (Node.js)  │ ← Runs separately
│  - Uses ODBC        │
│  - Polls changes    │
└──────────┬──────────┘
           │ ODBC
┌──────────▼──────────┐
│ Peachtree Database  │
└─────────────────────┘
```

**Pros:**
- ✅ Can use native ODBC modules
- ✅ No Electron conflicts
- ✅ Real-time sync possible
- ✅ Bidirectional sync
- ✅ Runs in background

**Cons:**
- ⚠️ Separate installation required
- ⚠️ More complex architecture
- ⚠️ Windows-only (ODBC drivers)
- ⚠️ Extra maintenance overhead

**Implementation:**

**1. Sync Service (`peachtree-sync-service/`)**
```typescript
// sync-service/index.ts
import odbc from 'odbc'; // OK here (no Electron)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class PeachtreeSync {
  private connection: any;
  
  async connect() {
    this.connection = await odbc.connect({
      connectionString: 'DSN=Peachtree;'
    });
  }
  
  async syncCustomers() {
    // Read from Peachtree
    const ptCustomers = await this.connection.query(
      'SELECT * FROM Customers'
    );
    
    // Write to Supabase
    await supabase.from('customers').upsert(
      ptCustomers.map(mapCustomer)
    );
  }
  
  async watchChanges() {
    // Poll every 5 minutes
    setInterval(() => {
      this.syncCustomers();
      this.syncInvoices();
      // ... sync other entities
    }, 5 * 60 * 1000);
  }
}

// Run as background service
const sync = new PeachtreeSync();
sync.connect();
sync.watchChanges();
```

**2. Package as Windows Service**
```json
// package.json
{
  "name": "sageflow-peachtree-sync",
  "scripts": {
    "build": "pkg . --targets node18-win-x64",
    "install-service": "node-windows install"
  },
  "dependencies": {
    "odbc": "^2.4.0",
    "@supabase/supabase-js": "^2.0.0",
    "node-windows": "^1.0.0"
  }
}
```

**3. SageFlow Shows Sync Status**
```typescript
// In SageFlow Desktop
const syncStatus = await supabase
  .from('sync_status')
  .select('*')
  .single();

// Show in UI:
// "Last sync: 2 minutes ago"
// "Peachtree Sync Service: Running ✅"
```

**Installation for Users:**
1. Install SageFlow Desktop
2. Install Peachtree Sync Service (separate .exe)
3. Configure ODBC connection
4. Service runs in background
5. Data syncs automatically

**Time to Implement:** 2-3 weeks
**Maintenance:** Medium (Windows service management)
**User-Friendly:** Medium (extra installation step)

---

### 🏅 **Option 4: Web-Only Peachtree Integration** ⭐ CLEANEST

**How It Works:**
```
SageFlow Web App → Serverless Function → Peachtree API/File
```

**Pros:**
- ✅ No Electron conflicts (not using Electron!)
- ✅ Can use Node.js libraries freely
- ✅ Serverless scalability
- ✅ No client-side ODBC
- ✅ Cross-platform

**Cons:**
- ⚠️ Only works in web version
- ⚠️ Requires Peachtree file upload
- ⚠️ Or Peachtree must be accessible via network

**Architecture:**
```
┌────────────────────┐
│  SageFlow Web App  │
│  (Mac - Vite)      │
└─────────┬──────────┘
          │ HTTPS
┌─────────▼──────────┐
│  Vercel Edge Fn    │
│  or API Route      │
└─────────┬──────────┘
          │
┌─────────▼──────────┐
│  PTB File Parser   │ ← Pure JavaScript
│  OR CSV Import     │
└─────────┬──────────┘
          │
┌─────────▼──────────┐
│  Supabase          │
└────────────────────┘
```

**Implementation:**
```typescript
// app/api/peachtree/import/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('ptb') as File;
  
  // Parse PTB file (pure JS - no ODBC)
  const buffer = await file.arrayBuffer();
  const parser = new PTBParser(Buffer.from(buffer));
  const data = parser.parseAll();
  
  // Import to Supabase
  await supabase.from('customers').insert(data.customers);
  
  return Response.json({ success: true });
}
```

**Best For:**
- Mac web app version (your refactor/vite-react branch)
- SaaS deployment
- Cloud-first architecture

**Time to Implement:** 1-2 weeks
**Maintenance:** Low
**User-Friendly:** High (web upload)

---

## 🎯 RECOMMENDATION BY USE CASE

### If Targeting Small Businesses (Recommended):
**Use Option 1: CSV Import/Export**
- Easiest to implement
- Users understand CSV
- Works in both desktop & web
- No complex setup

### If Want Best UX:
**Use Option 2: PTB File Parser**
- Drag & drop experience
- One-click import
- Professional feel
- Worth the development time

### If Need Real-Time Sync:
**Use Option 3: Separate Sync Service**
- Automatic background sync
- Bidirectional updates
- Enterprise feature
- Complex but powerful

### If Focusing on Web SaaS:
**Use Option 4: Web-Only Integration**
- Cleanest architecture
- No Electron issues
- Serverless scalability
- Modern approach

---

## 📊 Comparison Matrix

| Feature | CSV Import | PTB Parser | Sync Service | Web-Only |
|---------|-----------|------------|--------------|----------|
| Ease of Implementation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| User Experience | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| Real-time Sync | ❌ | ❌ | ✅ | ❌ |
| Works in Desktop | ✅ | ✅ | ✅ | ❌ |
| Works in Web | ✅ | ✅ | ⚠️ | ✅ |
| No ODBC Needed | ✅ | ✅ | ❌ | ✅ |
| Bidirectional | Manual | ❌ | ✅ | Manual |

---

## 🚀 QUICK START (Option 1: CSV)

**Step 1: Install Dependencies**
```bash
pnpm add papaparse
pnpm add -D @types/papaparse
```

**Step 2: Create Import Function**
```typescript
// src/lib/peachtree/csv-import.ts
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

export async function importPeachtreeCustomers(file: File) {
  const result = await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: resolve,
      error: reject
    });
  });
  
  const customers = result.data.map(mapPeachtreeToSageFlow);
  
  const { data, error } = await supabase
    .from('customers')
    .insert(customers);
    
  return { data, error };
}
```

**Step 3: Add UI Component**
```tsx
// src/components/peachtree/import-button.tsx
'use client';

export function PeachtreeImportButton() {
  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await importPeachtreeCustomers(file);
    toast.success(`Imported ${result.data.length} customers!`);
  };
  
  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleImport}
        className="hidden"
        id="peachtree-import"
      />
      <label htmlFor="peachtree-import">
        <Button>Import from Peachtree</Button>
      </label>
    </div>
  );
}
```

**Step 4: User Instructions**
```markdown
## How to Import from Peachtree

1. Open Peachtree Complete Accounting
2. Go to Reports → Customers → Customer List
3. Click Export → Export to CSV
4. Save the file
5. In SageFlow, click "Import from Peachtree"
6. Select the CSV file
7. Review and confirm import
```

**Time: 2-4 hours to implement!**

---

## 🎯 MY RECOMMENDATION

### For SageFlow Desktop (Windows):
**Use Option 1 (CSV) + Option 2 (PTB Parser)**

**Phase 1 (Now):**
- Implement CSV import/export
- Ship desktop app this week
- Get user feedback

**Phase 2 (Next Month):**
- Analyze your PTB file: `SWK 2018-011026.ptb`
- Build PTB parser
- Add drag & drop PTB import
- Premium feature!

### For SageFlow Web (Mac):
**Use Option 1 (CSV) + Option 4 (Web Integration)**

**Phase 1:**
- CSV import/export
- Ship web app

**Phase 2:**
- Add PTB upload & parsing
- Serverless processing
- Modern SaaS experience

---

## 📝 FIELD MAPPING REFERENCE

### Peachtree → SageFlow Customer Mapping
```typescript
const fieldMapping = {
  // Peachtree Field → SageFlow Field
  'Customer ID': 'customerId',
  'Customer Name': 'name',
  'Contact': 'contactName',
  'Address Line 1': 'address.street',
  'Address Line 2': 'address.street2',
  'City': 'address.city',
  'State': 'address.state',
  'Zip': 'address.zip',
  'Country': 'address.country',
  'Phone 1': 'phone',
  'Phone 2': 'phone2',
  'Fax': 'fax',
  'Email': 'email',
  'Terms': 'paymentTerms',
  'Tax ID': 'taxId',
  'Credit Limit': 'creditLimit',
  'Account Number': 'accountNumber'
};
```

---

## ✅ NEXT STEPS

1. **Choose Your Approach:**
   - Quick win: CSV Import (2-4 hours)
   - Best UX: PTB Parser (1-2 weeks)
   - Enterprise: Sync Service (2-3 weeks)
   - SaaS: Web-Only (1-2 weeks)

2. **Start with CSV:**
   - Works in both versions
   - Users already know how
   - Ship it this week!

3. **Add PTB Later:**
   - Premium feature
   - Better UX
   - Revenue opportunity

---

**Bottom Line:** Don't let Peachtree integration block your launch. Ship with CSV import/export now, add PTB parsing later as a premium feature! 🚀

