-- ============================================
-- SageFlow RLS (Row Level Security) Policies
-- ============================================
-- Run this in Supabase SQL Editor after creating tables
-- Dashboard > SQL Editor > New Query > Paste & Run

-- ============================================
-- Step 1: Enable RLS on all tables
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 2: Helper function to get user's company_id
-- ============================================

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS TEXT AS $$
  SELECT company_id FROM users WHERE id = auth.uid()::text
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Step 3: Companies policies
-- ============================================

-- Users can only view their own company
CREATE POLICY "users_can_view_own_company" ON companies
  FOR SELECT USING (id = get_user_company_id());

-- Users can update their own company (ADMIN role check could be added)
CREATE POLICY "users_can_update_own_company" ON companies
  FOR UPDATE USING (id = get_user_company_id());

-- ============================================
-- Step 4: Users policies
-- ============================================

-- Users can view users in their company
CREATE POLICY "users_can_view_company_users" ON users
  FOR SELECT USING (company_id = get_user_company_id());

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON users
  FOR UPDATE USING (id = auth.uid()::text);

-- Allow inserting new user (for registration - handled by auth trigger typically)
CREATE POLICY "allow_user_insert" ON users
  FOR INSERT WITH CHECK (true);

-- ============================================
-- Step 5: Customers policies
-- ============================================

CREATE POLICY "company_customers_select" ON customers
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_customers_insert" ON customers
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_customers_update" ON customers
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_customers_delete" ON customers
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Step 6: Vendors policies
-- ============================================

CREATE POLICY "company_vendors_select" ON vendors
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_vendors_insert" ON vendors
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_vendors_update" ON vendors
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_vendors_delete" ON vendors
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Step 7: Invoices policies
-- ============================================

CREATE POLICY "company_invoices_select" ON invoices
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_invoices_insert" ON invoices
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_invoices_update" ON invoices
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_invoices_delete" ON invoices
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Step 8: Invoice Items policies (via invoice)
-- ============================================

CREATE POLICY "company_invoice_items_select" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_invoice_items_insert" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_invoice_items_update" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_invoice_items_delete" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

-- ============================================
-- Step 9: Payments policies
-- ============================================

CREATE POLICY "company_payments_select" ON payments
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_payments_insert" ON payments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_payments_update" ON payments
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_payments_delete" ON payments
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Step 10: Items (Inventory) policies
-- ============================================

CREATE POLICY "company_items_select" ON items
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_items_insert" ON items
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_items_update" ON items
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_items_delete" ON items
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Step 11: Bank Accounts policies
-- ============================================

CREATE POLICY "company_bank_accounts_select" ON bank_accounts
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_bank_accounts_insert" ON bank_accounts
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_bank_accounts_update" ON bank_accounts
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_bank_accounts_delete" ON bank_accounts
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Step 12: Bank Transactions policies (via bank_account)
-- ============================================

CREATE POLICY "company_bank_transactions_select" ON bank_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = bank_transactions.bank_account_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_bank_transactions_insert" ON bank_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = bank_transactions.bank_account_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_bank_transactions_update" ON bank_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = bank_transactions.bank_account_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_bank_transactions_delete" ON bank_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = bank_transactions.bank_account_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

-- ============================================
-- Step 13: Bank Reconciliations policies (via bank_account)
-- ============================================

CREATE POLICY "company_bank_reconciliations_select" ON bank_reconciliations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = bank_reconciliations.bank_account_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_bank_reconciliations_insert" ON bank_reconciliations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = bank_reconciliations.bank_account_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

-- ============================================
-- Step 14: Additional tables with company_id
-- ============================================

-- Chart of Accounts
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_chart_of_accounts_select" ON chart_of_accounts
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_chart_of_accounts_insert" ON chart_of_accounts
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_chart_of_accounts_update" ON chart_of_accounts
  FOR UPDATE USING (company_id = get_user_company_id());

-- Employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_employees_select" ON employees
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_employees_insert" ON employees
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_employees_update" ON employees
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_employees_delete" ON employees
  FOR DELETE USING (company_id = get_user_company_id());

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_audit_logs_select" ON audit_logs
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Purchase Orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_purchase_orders_select" ON purchase_orders
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_purchase_orders_insert" ON purchase_orders
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_purchase_orders_update" ON purchase_orders
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_purchase_orders_delete" ON purchase_orders
  FOR DELETE USING (company_id = get_user_company_id());

-- Purchase Order Items (via purchase_orders)
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_purchase_order_items_select" ON purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.po_id
      AND purchase_orders.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_purchase_order_items_insert" ON purchase_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.po_id
      AND purchase_orders.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_purchase_order_items_delete" ON purchase_order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.po_id
      AND purchase_orders.company_id = get_user_company_id()
    )
  );

-- Bills
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_bills_select" ON bills
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_bills_insert" ON bills
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_bills_update" ON bills
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_bills_delete" ON bills
  FOR DELETE USING (company_id = get_user_company_id());

-- Bill Payments
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_bill_payments_select" ON bill_payments
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_bill_payments_insert" ON bill_payments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Journal Entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_journal_entries_select" ON journal_entries
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_journal_entries_insert" ON journal_entries
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_journal_entries_update" ON journal_entries
  FOR UPDATE USING (company_id = get_user_company_id());

-- Journal Lines (via journal_entries)
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_journal_lines_select" ON journal_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_lines.journal_entry_id
      AND journal_entries.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_journal_lines_insert" ON journal_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_lines.journal_entry_id
      AND journal_entries.company_id = get_user_company_id()
    )
  );

-- Item Categories
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_item_categories_select" ON item_categories
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_item_categories_insert" ON item_categories
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_item_categories_update" ON item_categories
  FOR UPDATE USING (company_id = get_user_company_id());

-- Stock Movements (via items)
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_stock_movements_select" ON stock_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = stock_movements.item_id
      AND items.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_stock_movements_insert" ON stock_movements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = stock_movements.item_id
      AND items.company_id = get_user_company_id()
    )
  );

-- Assemblies
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_assemblies_select" ON assemblies
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_assemblies_insert" ON assemblies
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_assemblies_update" ON assemblies
  FOR UPDATE USING (company_id = get_user_company_id());

-- Assembly Items (via assemblies)
ALTER TABLE assembly_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_assembly_items_select" ON assembly_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assemblies
      WHERE assemblies.id = assembly_items.assembly_id
      AND assemblies.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_assembly_items_insert" ON assembly_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assemblies
      WHERE assemblies.id = assembly_items.assembly_id
      AND assemblies.company_id = get_user_company_id()
    )
  );

-- Inventory Adjustments
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_inventory_adjustments_select" ON inventory_adjustments
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_inventory_adjustments_insert" ON inventory_adjustments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Adjustment Items (via inventory_adjustments)
ALTER TABLE adjustment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_adjustment_items_select" ON adjustment_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventory_adjustments
      WHERE inventory_adjustments.id = adjustment_items.adjustment_id
      AND inventory_adjustments.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_adjustment_items_insert" ON adjustment_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_adjustments
      WHERE inventory_adjustments.id = adjustment_items.adjustment_id
      AND inventory_adjustments.company_id = get_user_company_id()
    )
  );

-- Reconciliation Items (via bank_reconciliations -> bank_accounts)
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_reconciliation_items_select" ON reconciliation_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bank_reconciliations
      JOIN bank_accounts ON bank_accounts.id = bank_reconciliations.bank_account_id
      WHERE bank_reconciliations.id = reconciliation_items.reconciliation_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "company_reconciliation_items_insert" ON reconciliation_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bank_reconciliations
      JOIN bank_accounts ON bank_accounts.id = bank_reconciliations.bank_account_id
      WHERE bank_reconciliations.id = reconciliation_items.reconciliation_id
      AND bank_accounts.company_id = get_user_company_id()
    )
  );

-- ============================================
-- Step 15: Sessions table (no RLS - handled by Auth)
-- ============================================
-- Sessions table is managed by Supabase Auth, no RLS needed

-- ============================================
-- Done! All RLS policies created.
-- ============================================
--
-- Note: These policies ensure:
-- 1. Users can only see data from their own company
-- 2. Users can only create/update/delete data in their own company
-- 3. Related records (invoice_items, transactions) inherit access from parent
--
-- For production, consider adding role-based restrictions:
-- - ADMIN: Full access
-- - MANAGER: Read/write most things
-- - ACCOUNTANT: Financial data only
-- - VIEWER: Read-only access
