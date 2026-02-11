
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseServiceKey);

async function listTriggers() {
  console.log('🔍 Listing Triggers for relevant tables...');

  // Query pg_trigger
  // Note: We can't query detailed system catalogs easily via client unless we use a function.
  // But we can check if we have a "get_db_info" or similar RPC, or try to infer from behavior.
  // Actually, we can try to inspect via `information_schema.triggers` if we have access.

  // Let's try to verify if the company exists continuously first.
  let exists = true;
  const companyId = '6b891b90-b3d8-44d6-9b61-d7083b8520c4';

  const { data, error } = await sb.from('companies').select('id').eq('id', companyId).single();
  if (error || !data) {
    console.log('❌ Company MISSING at start of script!');
    exists = false;
  } else {
    console.log('✅ Company EXISTS at start of script.');
  }

  // Attempt to insert a dummy customer to see if it triggers deletion
  if (exists) {
    console.log('🧪 Attempting Transactional Insert Test...');

    const { data: cData, error: cError } = await sb.from('customers').insert({
      id: crypto.randomUUID(),
      company_id: companyId,
      customer_number: 'TEST-TRIGGER',
      name: 'Trigger Test Customer',
      is_active: true
    }).select();

    if (cError) {
      console.error('❌ Insert failed:', cError);
    } else {
      console.log('✅ Insert succeeded. Checking company again...');
      const { data: c2, error: e2 } = await sb.from('companies').select('id').eq('id', companyId).single();
      if (e2 || !c2) {
        console.error('🚨 ALARM: Company was DELETED after customer insert!');
      } else {
        console.log('✅ Company still exists after insert.');
        // Test Vendors
        console.log('🧪 Attempting Vendor Insert Test...');
        const { error: vError } = await sb.from('vendors').insert({
          id: crypto.randomUUID(),
          company_id: companyId,
          vendor_number: 'TEST-VEND',
          name: 'Trigger Test Vendor',
          is_active: true
        });

        if (vError) console.error('❌ Vendor Insert failed:', vError);
        else {
          const { data: c3 } = await sb.from('companies').select('id').eq('id', companyId).single();
          if (!c3) console.error('🚨 ALARM: Company DELETED after vendor insert!');
          else {
            console.log('✅ Company still exists after vendor insert.');
            await sb.from('vendors').delete().eq('vendor_number', 'TEST-VEND');
          }
        }

        // Test Accounts
        console.log('🧪 Attempting Account Insert Test...');
        const { error: aError } = await sb.from('chart_of_accounts').insert({
          id: crypto.randomUUID(),
          company_id: companyId,
          account_number: 'TEST-ACCT',
          account_name: 'Trigger Test Account',
          type: 'ASSET',
          is_active: true
        });

        if (aError) console.error('❌ Account Insert failed:', aError);
        else {
          const { data: c4 } = await sb.from('companies').select('id').eq('id', companyId).single();
          if (!c4) console.error('🚨 ALARM: Company DELETED after account insert!');
          else {
            console.log('✅ Company still exists after account insert.');
            await sb.from('chart_of_accounts').delete().eq('account_number', 'TEST-ACCT');
          }
        }
      }

    }
  }
}

listTriggers();
