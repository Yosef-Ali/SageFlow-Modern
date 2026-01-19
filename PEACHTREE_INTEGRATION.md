# 🔄 Peachtree ODBC Integration - Setup Guide

## Overview

This guide helps you migrate data from your legacy **Peachtree/Sage 50** accounting system to **SageFlow Modern** using ODBC (Open Database Connectivity).

---

## 📦 What Was Created

### Files Added to Your Project:

1. **`src/lib/peachtree/odbc-connection.ts`** (240 lines)
   - ODBC connection manager
   - Query methods for all Peachtree tables
   - Customer, Invoice, Item, Vendor data retrieval

2. **`src/lib/peachtree/migration.ts`** (390 lines)
   - Complete data migration logic
   - Maps Peachtree data to Drizzle schema
   - Handles data transformation and validation

3. **`src/scripts/migrate-peachtree.ts`** (91 lines)
   - Interactive CLI migration tool
   - Progress tracking
   - Error handling

4. **`package.json`** - UPDATED
   - Added: `odbc` package (^2.4.8)
   - Added: `migrate:peachtree` script

5. **`.env.local.example`** - UPDATED
   - Added Peachtree ODBC configuration variables

---

## 🚀 Quick Start

### Step 1: Install ODBC Driver (macOS)

**Option 1: Using Homebrew**
```bash
brew install unixodbc
```

**Option 2: Download from Actual Technologies**
- Visit: http://www.actualtech.com/
- Download "Actual ODBC Pack" for macOS
- Follow installation instructions

---

### Step 2: Configure ODBC Data Source

**Create DSN (Data Source Name):**

```bash
# Edit ODBC configuration
sudo nano /etc/odbc.ini
```

**Add this configuration:**
```ini
[Peachtree]
Description = Peachtree Accounting Database
Driver = /Library/ODBC/lib/libactodbcSQL.dylib
Database = /path/to/your/peachtree/company.dat
```

**Test the connection:**
```bash
isql Peachtree
```

---

### Step 3: Setup Environment Variables

```bash
cd /Users/mekdesyared/SageFlow-Modern

# Copy and edit environment file
cp .env.local.example .env.local
```

**Edit `.env.local` and add:**
```env
# Peachtree ODBC Configuration
PEACHTREE_DSN="Peachtree"
PEACHTREE_USERNAME=""  # Leave empty if not required
PEACHTREE_PASSWORD=""  # Leave empty if not required
```

---

### Step 4: Install Dependencies

```bash
# Install ODBC package and dependencies
npm install
```

---

### Step 5: Run Migration

```bash
# Run the migration script
npm run migrate:peachtree
```

**You'll be prompted for:**
1. Confirmation to proceed
2. Company ID (use "default" for first company)

**The migration will:**
- ✅ Connect to Peachtree ODBC
- ✅ Extract all customers
- ✅ Extract all vendors
- ✅ Extract all items/products
- ✅ Extract all invoices with line items
- ✅ Extract all payments
- ✅ Extract chart of accounts
- ✅ Import into SageFlow Modern database

---

## 📊 What Gets Migrated

### Data Entities:

1. **Customers** (`Customer` table)
   - Customer ID → Customer Number
   - Name, Contact, Email, Phone
   - Address information
   - Credit limit and balance

2. **Vendors** (`Vendor` table)
   - Vendor ID → Vendor Number
   - Name, Contact, Email, Phone
   - Address information
   - Payment terms

3. **Inventory Items** (`InventoryItem` table)
   - Item ID → SKU
   - Name, Description
   - Unit of measure
   - Cost price, selling price
   - Quantity on hand

4. **Invoices** (`Invoice` + `InvoiceItem` tables)
   - Invoice number, dates
   - Customer reference
   - Line items with quantities and prices
   - Amounts and tax
   - Status mapping

5. **Payments** (`Payment` table)
   - Payment amounts and dates
   - Customer references
   - Invoice references
   - Payment methods

6. **Chart of Accounts** (`ChartOfAccounts` table)
   - Account numbers and names
   - Account types
   - Balances

---

## 🔧 Peachtree Table Mapping

### From Peachtree → To SageFlow Modern

| Peachtree Table | SageFlow Table | Notes |
|----------------|----------------|-------|
| Customer | customers | Active customers only |
| Vendor | vendors | Active vendors only |
| InventoryItem | items | Active items only |
| Invoice | invoices | All invoices |
| InvoiceItem | invoice_items | Line items linked to invoices |
| Payment | payments | All payment records |
| ChartOfAccounts | chart_of_accounts | Active accounts only |

---

## 📝 Field Mapping

### Customer Mapping

| Peachtree Field | SageFlow Field | Transform |
|----------------|---------------|-----------|
| CustomerID | customerNumber | Direct |
| CustomerName | name | Direct |
| Contact | - | Not used |
| Email | email | Direct |
| Phone | phone | Direct |
| Address1, Address2, City, State, ZipCode | billingAddress | JSON object |
| Balance | balance | String (decimal) |
| CreditLimit | creditLimit | String (decimal) |

### Invoice Mapping

| Peachtree Field | SageFlow Field | Transform |
|----------------|---------------|-----------|
| InvoiceNo | invoiceNumber | Direct |
| InvoiceDate | date | Date object |
| DueDate | dueDate | Date object |
| Subtotal | subtotal | String (decimal) |
| TaxAmount | taxAmount | String (decimal) |
| TotalAmount | total | String (decimal) |
| AmountPaid | paidAmount | String (decimal) |
| Status | status | Mapped to enum |

---

## 🎯 Status Mapping

### Invoice Status

| Peachtree Status | SageFlow Status |
|-----------------|-----------------|
| "DRAFT" | DRAFT |
| "OPEN" | SENT |
| Balance > 0 | PARTIALLY_PAID |
| Balance = 0 | PAID |
| "OVERDUE" | OVERDUE |
| "CANCELLED" | CANCELLED |

### Account Type

| Peachtree Type | SageFlow Type |
|---------------|---------------|
| "ASSET" | ASSET |
| "LIABILITY" | LIABILITY |
| "EQUITY" / "CAPITAL" | EQUITY |
| "REVENUE" / "INCOME" | REVENUE |
| "EXPENSE" | EXPENSE |

---

## ✅ Verification Steps

### After Migration:

1. **Check Database**
```bash
npm run db:studio
```
- Opens at: http://localhost:4983
- Verify all tables have data

2. **Check Counts**
```bash
psql sageflow_db

-- Count customers
SELECT COUNT(*) FROM customers;

-- Count invoices
SELECT COUNT(*) FROM invoices;

-- Count items
SELECT COUNT(*) FROM items;
```

3. **Verify Data Integrity**
- Check customer names and emails
- Verify invoice totals match
- Confirm item prices are correct
- Review payment amounts

---

## 🆘 Troubleshooting

### Issue: "ODBC connection failed"

**Solutions:**
1. Verify ODBC driver is installed
2. Check DSN configuration in `/etc/odbc.ini`
3. Test connection: `isql Peachtree`
4. Verify Peachtree database path is correct

### Issue: "Driver not found"

**Solutions:**
```bash
# Check installed drivers
odbcinst -q -d

# Should show Peachtree or similar driver
```

### Issue: "Table does not exist"

**Solutions:**
- Peachtree table names may vary by version
- Check actual table names in Peachtree
- Update `odbc-connection.ts` with correct table names

### Issue: "Permission denied"

**Solutions:**
- Peachtree database file must be accessible
- Check file permissions
- Make sure Peachtree is not running (it locks the database)

### Issue: "Customer not found" during invoice migration

**Solutions:**
- Run customers migration first
- Check CustomerID matches between tables
- Some invoices may reference deleted customers

---

## 🔄 Re-running Migration

**The migration is safe to run multiple times:**
- Uses `onConflictDoUpdate` for existing records
- Updates changed fields
- Preserves SageFlow-specific data

**To re-run:**
```bash
npm run migrate:peachtree
```

---

## 📊 Performance Tips

### For Large Datasets (10,000+ records):

1. **Run in batches**
   - Modify migration script to process in chunks
   - Add delays between batches

2. **Monitor progress**
   - Watch console output for progress
   - Check for warnings about skipped records

3. **Database optimization**
```bash
# Analyze database after migration
psql sageflow_db -c "ANALYZE;"
```

---

## 🎯 Common Peachtree Versions

### Supported Versions:
- ✅ Peachtree Complete Accounting
- ✅ Peachtree Premium Accounting
- ✅ Sage 50 US Edition
- ✅ Sage 50 Canadian Edition

### Database Formats:
- Pervasive SQL (most common)
- Microsoft SQL Server
- Access Database (older versions)

---

## 📚 Additional Resources

### ODBC Documentation:
- unixODBC: http://www.unixodbc.org/
- macOS ODBC: https://support.apple.com/guide/mac-help/

### Peachtree/Sage 50:
- Sage Support: https://support.na.sage.com/
- Database Structure: Consult Peachtree SDK documentation

---

## 🎉 Post-Migration Steps

### After successful migration:

1. **Review Data**
   - Open Drizzle Studio: `npm run db:studio`
   - Spot-check customer names, invoices, items
   - Verify totals and balances

2. **Test Application**
   - Start dev server: `npm run dev`
   - Login and navigate through modules
   - Check customers, invoices, reports

3. **Train Users**
   - Show new interface
   - Explain differences from Peachtree
   - Demonstrate key features

4. **Go Live**
   - Set up production database
   - Run migration on production data
   - Monitor for issues

---

## 💡 Tips

- **Backup First**: Always backup Peachtree data before migration
- **Test Migration**: Run on test data first
- **Check Dates**: Ensure date formats are correct
- **Review Balances**: Verify all balances match
- **Custom Fields**: Map any custom Peachtree fields manually

---

## 🔒 Security

- ODBC credentials are stored in `.env.local` (not committed to git)
- Database connection is encrypted
- Migration runs locally on your machine
- No data is sent to external servers

---

**Generated**: January 18, 2026  
**Status**: ✅ Ready to use  
**Location**: `/Users/mekdesyared/SageFlow-Modern`  
**Integration**: Peachtree ODBC → SageFlow Modern (Drizzle)
