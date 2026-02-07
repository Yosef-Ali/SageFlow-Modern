-- ==========================================
-- FINAL VISIBILITY FIX
-- ==========================================
-- The previous script added INSERT permissions but missed SELECT permissions
-- for some tables, causing them to be hidden in the UI.

-- 1. Chart of Accounts
DROP POLICY IF EXISTS "company_chart_of_accounts_select" ON chart_of_accounts;
CREATE POLICY "company_chart_of_accounts_select" ON chart_of_accounts
  FOR SELECT USING (company_id = get_user_company_id());

-- 2. Items (Inventory)
DROP POLICY IF EXISTS "company_items_select" ON items;
CREATE POLICY "company_items_select" ON items
  FOR SELECT USING (company_id = get_user_company_id());

-- 3. Employees
DROP POLICY IF EXISTS "company_employees_select" ON employees;
CREATE POLICY "company_employees_select" ON employees
  FOR SELECT USING (company_id = get_user_company_id());

-- 4. Journals
DROP POLICY IF EXISTS "company_journal_entries_select" ON journal_entries;
CREATE POLICY "company_journal_entries_select" ON journal_entries
  FOR SELECT USING (company_id = get_user_company_id());

-- 5. Journal Lines
DROP POLICY IF EXISTS "company_journal_lines_select" ON journal_lines;
CREATE POLICY "company_journal_lines_select" ON journal_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_lines.journal_entry_id
      AND journal_entries.company_id = get_user_company_id()
    )
  );

-- 6. Invoices (Just in case)
DROP POLICY IF EXISTS "company_invoices_select" ON invoices;
CREATE POLICY "company_invoices_select" ON invoices
  FOR SELECT USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "company_invoices_insert" ON invoices;
CREATE POLICY "company_invoices_insert" ON invoices
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- 7. Invoice Items (Just in case)
DROP POLICY IF EXISTS "company_invoice_items_select" ON invoice_items;
CREATE POLICY "company_invoice_items_select" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "company_invoice_items_insert" ON invoice_items;
CREATE POLICY "company_invoice_items_insert" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

SELECT 'All visibility policies applied successfully' as result;
