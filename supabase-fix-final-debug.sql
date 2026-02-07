-- ==========================================
-- FINAL DEBUG FIX
-- ==========================================

-- 1. Redefine Helper with Explicit Casting
-- This ensures UUID vs Text comparison never fails
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS TEXT AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.role() = 'authenticated' THEN
    RETURN (
      SELECT company_id 
      FROM public.users 
      WHERE id::text = auth.uid()::text
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Debug: Grant Access to Public Users for RLS Helper
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO service_role;

-- 3. Re-apply Select Policies (Just to be safe)
DROP POLICY IF EXISTS "company_chart_of_accounts_select" ON chart_of_accounts;
CREATE POLICY "company_chart_of_accounts_select" ON chart_of_accounts
  FOR SELECT USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "company_items_select" ON items;
CREATE POLICY "company_items_select" ON items
  FOR SELECT USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "company_journal_entries_select" ON journal_entries;
CREATE POLICY "company_journal_entries_select" ON journal_entries
  FOR SELECT USING (company_id = get_user_company_id());

-- 4. Verify User Linkage
-- We cant return data easily here as we don't know the current user ID executing this script
-- BUT defining the function this way is the most robust way possible.

SELECT 'Helper function updated and policies refreshed' as result;
