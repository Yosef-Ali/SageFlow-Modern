# 🚀 SageFlow Modern - Quick Setup (No Docker)

## ✅ What's Already Done

Your codebase has been migrated from Prisma to Drizzle ORM:
- ✅ `src/db/schema.ts` - Complete database schema
- ✅ `src/db/index.ts` - Database connection
- ✅ `drizzle.config.ts` - Drizzle configuration
- ✅ `package.json` - Updated dependencies
- ✅ Example API routes

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install PostgreSQL (if not installed)

**macOS:**
```bash
# Option 1: Using Homebrew (recommended)
brew install postgresql@16
brew services start postgresql@16

# Option 2: Using Postgres.app
# Download from: https://postgresapp.com/
# Drag to Applications and open
```

**Check if installed:**
```bash
psql --version
# Should show: psql (PostgreSQL) 16.x
```

---

### Step 2: Create Database

```bash
# Create database
createdb sageflow_db

# Or if you have a password:
psql -U your_username -c "CREATE DATABASE sageflow_db;"
```

---

### Step 3: Setup Environment

```bash
cd /Users/mekdesyared/SageFlow-Modern

# Copy environment file
cp .env.local.example .env.local
```

**Edit `.env.local`** with your database connection:

```env
# If PostgreSQL has no password (default on macOS)
DATABASE_URL="postgresql://localhost:5432/sageflow_db"

# OR if you have username/password
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/sageflow_db"

# Other settings
NEXTAUTH_SECRET="your-secret-key-min-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"
```

---

### Step 4: Install Dependencies

```bash
# Remove old node_modules
rm -rf node_modules package-lock.json

# Install dependencies (includes Drizzle)
npm install
```

---

### Step 5: Create Database Tables

```bash
# Push schema to database
npm run db:push

# You should see:
# ✓ Applying SQL...
# ✓ Done!
```

---

### Step 6: Start Development

```bash
npm run dev
```

Visit: **http://localhost:3000** 🎉

---

## ✅ Verify Setup

```bash
# 1. Check PostgreSQL is running
psql -l
# Should list databases including sageflow_db

# 2. Check Drizzle can connect
npm run db:studio
# Opens at http://localhost:4983

# 3. Check dev server
npm run dev
# Opens at http://localhost:3000
```

---

## 🔧 Common Commands

### Development
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run linter
```

### Database
```bash
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio (visual editor)
npm run db:generate      # Generate migration files
npm run db:migrate       # Run migrations
```

### PostgreSQL Management
```bash
psql sageflow_db         # Connect to database
\dt                      # List tables
\d customers             # Describe table
\q                       # Quit

# Or use Drizzle Studio (easier)
npm run db:studio
```

---

## 🆘 Troubleshooting

### "createdb: command not found"
**Solution**: PostgreSQL not installed or not in PATH
```bash
# macOS with Homebrew
brew install postgresql@16

# Add to PATH if needed
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### "connection refused"
**Solution**: PostgreSQL not running
```bash
# Start PostgreSQL
brew services start postgresql@16

# Check status
brew services list
```

### "database does not exist"
**Solution**: Create the database
```bash
createdb sageflow_db
```

### "role does not exist"
**Solution**: Use correct username in DATABASE_URL
```bash
# Check your username
whoami

# Update .env.local
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/sageflow_db"
```

### "password authentication failed"
**Solution**: Either:
1. Remove password from DATABASE_URL (macOS default has no password)
2. Or set password: `psql -d postgres -c "ALTER USER your_username WITH PASSWORD 'newpassword';"`

---

## 📊 Database Access

### Option 1: Drizzle Studio (Recommended)
```bash
npm run db:studio
```
- URL: http://localhost:4983
- Visual table editor
- Query builder
- Fast and easy

### Option 2: Command Line
```bash
# Connect to database
psql sageflow_db

# Run queries
SELECT * FROM customers LIMIT 5;

# Quit
\q
```

### Option 3: GUI Tools
- **pgAdmin**: https://www.pgadmin.org/
- **Postico** (macOS): https://eggerapps.at/postico/
- **TablePlus**: https://tableplus.com/

---

## 🎯 Complete Setup Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `sageflow_db` created
- [ ] `.env.local` file created with DATABASE_URL
- [ ] Dependencies installed (`npm install`)
- [ ] Schema pushed to database (`npm run db:push`)
- [ ] Drizzle Studio works (`npm run db:studio`)
- [ ] Dev server starts (`npm run dev`)
- [ ] No Prisma type errors!

---

## 📝 Quick Reference

### Using Drizzle in Your Code

```typescript
// Import database
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';

// SELECT all
const allCustomers = await db.select().from(customers);

// SELECT with WHERE
const customer = await db.select()
  .from(customers)
  .where(eq(customers.id, customerId));

// INSERT
const [newCustomer] = await db.insert(customers)
  .values({
    companyId: 'comp-123',
    customerNumber: 'CUST0001',
    name: 'John Doe',
    email: 'john@example.com',
    balance: '0',
  })
  .returning();

// UPDATE
await db.update(customers)
  .set({ name: 'Jane Doe' })
  .where(eq(customers.id, customerId));

// DELETE
await db.delete(customers)
  .where(eq(customers.id, customerId));
```

---

## 🎉 That's It!

**No Docker needed!** You're using local PostgreSQL instead.

Your setup is simpler and faster for development:
- ✅ Local PostgreSQL
- ✅ Drizzle ORM
- ✅ No containers
- ✅ Direct database access
- ✅ Fast development

---

## 📚 What You Have

### Database Schema (9 Models)
1. Users & Sessions - Authentication
2. Companies - Multi-tenancy
3. Customers - CRM
4. Invoices & Items - Invoicing
5. Payments - Payment tracking
6. Items & Categories - Inventory
7. Stock Movements - Inventory tracking
8. Vendors - Supplier management
9. Chart of Accounts - Accounting

### Features
- Type-safe queries
- No code generation
- Visual database editor (Drizzle Studio)
- Example API routes
- Ethiopian Birr support (ETB)

---

**Ready to code!** 🚀

Just run:
```bash
npm install
npm run db:push
npm run dev
```

---

**Generated**: January 18, 2026  
**Status**: ✅ Drizzle migration complete  
**Database**: Local PostgreSQL (no Docker)  
**Location**: /Users/mekdesyared/SageFlow-Modern
