-- ============================================
-- SageFlow RLS Fixes (Multi-tenancy & Sync)
-- ============================================

-- 1. Fix Companies INSERT Policy (Enable Registration)
-- Allow any authenticated user to create a company if they don't have one? 
-- Or just allow insert true? Typically for registration we allow insert.

DROP POLICY IF EXISTS "users_can_create_company" ON companies;

CREATE POLICY "users_can_create_company" ON companies
  FOR INSERT WITH CHECK (true);

-- 2. Sync Jobs RLS
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_sync_jobs_select" ON sync_jobs
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_sync_jobs_insert" ON sync_jobs
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_sync_jobs_update" ON sync_jobs
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_sync_jobs_delete" ON sync_jobs
  FOR DELETE USING (company_id = get_user_company_id());

-- 3. Sync Entity Map RLS
ALTER TABLE sync_entity_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_sync_entity_map_select" ON sync_entity_map
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_sync_entity_map_insert" ON sync_entity_map
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_sync_entity_map_update" ON sync_entity_map
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_sync_entity_map_delete" ON sync_entity_map
  FOR DELETE USING (company_id = get_user_company_id());

-- 4. Sync Configs RLS
ALTER TABLE sync_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_sync_configs_select" ON sync_configs
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "company_sync_configs_insert" ON sync_configs
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_sync_configs_update" ON sync_configs
  FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "company_sync_configs_delete" ON sync_configs
  FOR DELETE USING (company_id = get_user_company_id());

-- ============================================
-- Fixes Applied.
-- Run this in Supabase SQL Editor.
-- ============================================
