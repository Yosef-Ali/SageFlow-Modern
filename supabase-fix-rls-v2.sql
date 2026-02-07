-- ==========================================
-- Fix 3: Ensure RLS Helper is Safe
-- ==========================================
-- Re-create the helper to be absolutely sure it works for both
-- authenticated users and potentially anon if testing (though risky)
-- SECURITY DEFINER is key here.

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS TEXT AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.role() = 'authenticated' THEN
    RETURN (SELECT company_id FROM public.users WHERE id = auth.uid()::text);
  END IF;
  
  -- Fallback for development/testing if needed (remove in prod)
  -- RETURN 'demo-company-1'; 
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure public.users is accessible to the helper
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO service_role;

-- ==========================================
-- Fix 4: Policy Refresh (Idempotent)
-- ==========================================
-- Drop and recreate critical policies to ensure no stale logic

-- Customers
DROP POLICY IF EXISTS "company_customers_insert" ON customers;
CREATE POLICY "company_customers_insert" ON customers
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS "company_customers_select" ON customers;
CREATE POLICY "company_customers_select" ON customers
  FOR SELECT USING (company_id = get_user_company_id());

-- Vendors
DROP POLICY IF EXISTS "company_vendors_insert" ON vendors;
CREATE POLICY "company_vendors_insert" ON vendors
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS "company_vendors_select" ON vendors;
CREATE POLICY "company_vendors_select" ON vendors
  FOR SELECT USING (company_id = get_user_company_id());

-- Accounts
DROP POLICY IF EXISTS "company_chart_of_accounts_insert" ON chart_of_accounts;
CREATE POLICY "company_chart_of_accounts_insert" ON chart_of_accounts
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Items
DROP POLICY IF EXISTS "company_items_insert" ON items;
CREATE POLICY "company_items_insert" ON items
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Employees
DROP POLICY IF EXISTS "company_employees_insert" ON employees;
CREATE POLICY "company_employees_insert" ON employees
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Journals
DROP POLICY IF EXISTS "company_journal_entries_insert" ON journal_entries;
CREATE POLICY "company_journal_entries_insert" ON journal_entries
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Journal Lines (critical for import)
DROP POLICY IF EXISTS "company_journal_lines_insert" ON journal_lines;
CREATE POLICY "company_journal_lines_insert" ON journal_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_lines.journal_entry_id
      AND journal_entries.company_id = get_user_company_id()
    )
  );

