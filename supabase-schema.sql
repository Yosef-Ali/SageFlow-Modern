-- SageFlow Schema for Supabase
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============= ENUMS =============
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'ACCOUNTANT', 'MANAGER', 'EMPLOYEE', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE item_type AS ENUM ('PRODUCT', 'SERVICE', 'BUNDLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('RETAIL', 'WHOLESALE', 'GOVERNMENT', 'NGO', 'CORPORATE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_terms AS ENUM ('DUE_ON_RECEIPT', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', '2_10_NET_30', 'COD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vendor_type AS ENUM ('SUPPLIER', 'CONTRACTOR', 'GOVERNMENT', 'UTILITY', 'SERVICE_PROVIDER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bank_account_type AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bill_status AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'PARTIALLY_PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= TABLES =============

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'ETB',
  settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  company_id TEXT NOT NULL REFERENCES companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  customer_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  billing_address JSONB,
  shipping_address JSONB,
  credit_limit DECIMAL(15, 2),
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  customer_type customer_type DEFAULT 'RETAIL',
  payment_terms payment_terms DEFAULT 'NET_30',
  contact_name TEXT,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  tax_exempt BOOLEAN NOT NULL DEFAULT false,
  tax_exempt_number TEXT,
  price_level TEXT DEFAULT '1',
  sales_rep_id TEXT,
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  opening_balance_date TIMESTAMPTZ,
  customer_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  vendor_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,
  tax_id TEXT,
  payment_terms payment_terms DEFAULT 'NET_30',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  vendor_type vendor_type DEFAULT 'SUPPLIER',
  contact_name TEXT,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  credit_limit DECIMAL(15, 2),
  tax_exempt BOOLEAN NOT NULL DEFAULT false,
  tax_exempt_number TEXT,
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  opening_balance_date TIMESTAMPTZ,
  vendor_since TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items (Inventory)
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  unit_of_measure TEXT NOT NULL,
  type item_type NOT NULL DEFAULT 'PRODUCT',
  cost_price DECIMAL(15, 2) NOT NULL,
  selling_price DECIMAL(15, 2) NOT NULL,
  reorder_point DECIMAL(15, 2) NOT NULL DEFAULT 0,
  reorder_quantity DECIMAL(15, 2) NOT NULL DEFAULT 0,
  quantity_on_hand DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  selling_price_2 DECIMAL(15, 2),
  selling_price_3 DECIMAL(15, 2),
  preferred_vendor_id TEXT,
  taxable BOOLEAN NOT NULL DEFAULT true,
  weight DECIMAL(10, 4),
  weight_unit TEXT DEFAULT 'Kg',
  barcode TEXT,
  location TEXT,
  last_cost_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Item Categories
CREATE TABLE IF NOT EXISTS item_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  parent_id TEXT
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  invoice_number TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) NOT NULL,
  discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  terms TEXT,
  sales_rep_id TEXT,
  po_number TEXT,
  ship_method TEXT,
  ship_date TIMESTAMPTZ,
  ship_address JSONB,
  drop_ship BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  description TEXT NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  invoice_id TEXT REFERENCES invoices(id),
  amount DECIMAL(15, 2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  type account_type NOT NULL,
  parent_id TEXT,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  account_name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  account_type bank_account_type NOT NULL DEFAULT 'CHECKING',
  currency TEXT NOT NULL DEFAULT 'ETB',
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  reference TEXT,
  category TEXT,
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  statement_date TIMESTAMPTZ NOT NULL,
  statement_balance DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Reconciliation Items
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reconciliation_id TEXT NOT NULL REFERENCES bank_reconciliations(id),
  transaction_id TEXT NOT NULL REFERENCES bank_transactions(id),
  is_cleared BOOLEAN NOT NULL DEFAULT false
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  date TIMESTAMPTZ NOT NULL,
  reference TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'POSTED',
  source_type TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal Lines
CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id),
  account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
  description TEXT,
  debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  credit DECIMAL(15, 2) NOT NULL DEFAULT 0
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  user_id TEXT,
  employee_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  ssn TEXT,
  pay_method TEXT,
  pay_frequency TEXT,
  hire_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  employee_type TEXT DEFAULT 'REGULAR',
  pay_rate DECIMAL(15, 2),
  overtime_rate DECIMAL(5, 2) DEFAULT 1.5,
  bank_account_no TEXT,
  bank_name TEXT,
  tax_id TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  termination_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  action TEXT NOT NULL DEFAULT 'UNKNOWN',
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  user_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  po_number TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  expected_date TIMESTAMPTZ,
  status purchase_order_status NOT NULL DEFAULT 'DRAFT',
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_id TEXT NOT NULL REFERENCES purchase_orders(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  description TEXT,
  quantity DECIMAL(15, 4) NOT NULL,
  unit_cost DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  po_id TEXT REFERENCES purchase_orders(id),
  bill_number TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status bill_status NOT NULL DEFAULT 'OPEN',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bill Payments
CREATE TABLE IF NOT EXISTS bill_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  bill_id TEXT REFERENCES bills(id),
  amount DECIMAL(15, 2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_id TEXT NOT NULL REFERENCES items(id),
  type movement_type NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  cost DECIMAL(15, 2),
  reference_type TEXT,
  reference_id TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Assemblies
CREATE TABLE IF NOT EXISTS assemblies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  description TEXT,
  yield_quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assembly Items
CREATE TABLE IF NOT EXISTS assembly_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assembly_id TEXT NOT NULL REFERENCES assemblies(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity DECIMAL(15, 4) NOT NULL
);

-- Inventory Adjustments
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adjustment Items
CREATE TABLE IF NOT EXISTS adjustment_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  adjustment_id TEXT NOT NULL REFERENCES inventory_adjustments(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity DECIMAL(15, 4) NOT NULL,
  unit_cost DECIMAL(15, 2)
);

-- ============= INDEXES =============
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);

-- ============= RLS POLICIES =============
-- Enable RLS on key tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users (customize based on your needs)
-- You may want to restrict by company_id using auth.jwt() claims

CREATE POLICY "Allow all for authenticated" ON companies FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON vendors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON bank_accounts FOR ALL TO authenticated USING (true);

-- Grant usage to anon for demo mode
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

SELECT 'Schema created successfully!' as result;
