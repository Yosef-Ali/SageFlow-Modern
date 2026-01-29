
import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function applyRLS() {
  console.log(`Connecting to database...`);
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log(`✅ Connected.`);

    // 1. Create Helper Function
    console.log("Creating/Updating get_my_company_id() helper...");
    await client.query(`
      CREATE OR REPLACE FUNCTION get_my_company_id()
      RETURNS text AS $$
        SELECT company_id FROM public.users WHERE id = auth.uid()::text;
      $$ LANGUAGE sql STABLE SECURITY DEFINER;
    `);

    // 2. Enable RLS on all tables
    console.log("Enabling RLS on all tables...");
    await client.query(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
        LOOP
          EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
        END LOOP;
      END $$;
    `);

    // 3. Apply Multi-Tenancy Policies
    const policies = [
      // Companies
      { table: 'companies', sql: `CREATE POLICY "Tenant isolation" ON companies FOR ALL TO authenticated USING (id = get_my_company_id());` },

      // Users
      { table: 'users', sql: `CREATE POLICY "Tenant isolation" ON users FOR ALL TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());` },

      // Standard isolation (tables with company_id)
      ...[
        'customers', 'vendors', 'invoices', 'items', 'item_categories',
        'chart_of_accounts', 'bank_accounts', 'journal_entries',
        'employees', 'audit_logs', 'purchase_orders', 'bills',
        'bill_payments', 'assemblies', 'inventory_adjustments',
        'payments', 'sync_jobs', 'sync_entity_map', 'sync_configs'
      ].map(t => ({
        table: t,
        sql: `CREATE POLICY "Tenant isolation" ON ${t} FOR ALL TO authenticated USING (company_id = get_my_company_id()) WITH CHECK (company_id = get_my_company_id());`
      })),

      // Child isolation
      { table: 'invoice_items', sql: `CREATE POLICY "Tenant isolation" ON invoice_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM invoices WHERE id = invoice_id AND company_id = get_my_company_id()));` },
      { table: 'stock_movements', sql: `CREATE POLICY "Tenant isolation" ON stock_movements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM items WHERE id = item_id AND company_id = get_my_company_id()));` },
      { table: 'journal_lines', sql: `CREATE POLICY "Tenant isolation" ON journal_lines FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM journal_entries WHERE id = journal_entry_id AND company_id = get_my_company_id()));` },
      { table: 'purchase_order_items', sql: `CREATE POLICY "Tenant isolation" ON purchase_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM purchase_orders WHERE id = po_id AND company_id = get_my_company_id()));` },
      { table: 'bank_transactions', sql: `CREATE POLICY "Tenant isolation" ON bank_transactions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM bank_accounts WHERE id = bank_account_id AND company_id = get_my_company_id()));` },
      { table: 'assembly_items', sql: `CREATE POLICY "Tenant isolation" ON assembly_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM assemblies WHERE id = assembly_id AND company_id = get_my_company_id()));` },
      { table: 'adjustment_items', sql: `CREATE POLICY "Tenant isolation" ON adjustment_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM inventory_adjustments WHERE id = adjustment_id AND company_id = get_my_company_id()));` },
      { table: 'bank_reconciliations', sql: `CREATE POLICY "Tenant isolation" ON bank_reconciliations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM bank_accounts WHERE id = bank_account_id AND company_id = get_my_company_id()));` },
      { table: 'reconciliation_items', sql: `CREATE POLICY "Tenant isolation" ON reconciliation_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM bank_reconciliations WHERE id = reconciliation_id AND EXISTS (SELECT 1 FROM bank_accounts WHERE id = bank_account_id AND company_id = get_my_company_id())));` }
    ];

    for (const p of policies) {
      try {
        console.log(`Applying policy for ${p.table}...`);
        await client.query(`DROP POLICY IF EXISTS "Allow all for authenticated" ON ${p.table};`);
        await client.query(`DROP POLICY IF EXISTS "Tenant isolation" ON ${p.table};`);
        await client.query(p.sql);
        console.log(`   ✅ Success.`);
      } catch (err: any) {
        console.error(`   ❌ Error for ${p.table}: ${err.message}`);
      }
    }

    console.log("Reloading PostgREST schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✅ Schema cache reload notified.");

  } catch (err: any) {
    console.error(`❌ Connection error:`, err.message);
  } finally {
    await client.end();
  }
}

applyRLS();
