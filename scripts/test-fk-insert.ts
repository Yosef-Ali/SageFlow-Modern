import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testInsert() {
  const companyId = '6b891b90-b3d8-44d6-9b61-d7083b8520c4';
  console.log(`Testing Direct INSERT into customers for Company ID: ${companyId}`);

  // 1. Verify Company Exists
  const { data: company, error: cErr } = await supabaseAdmin.from('companies').select('id').eq('id', companyId).single();
  if (cErr) {
    console.error('❌ Company verification failed:', cErr.message);
    return;
  }
  console.log('✅ Company confirmed exists in DB.');

  // 2. Attempt Insert
  const { data, error } = await supabaseAdmin.from('customers').insert({
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_number: 'TEST-FK-001',
    name: 'Test FK Customer',
    is_active: true
  }).select();

  if (error) {
    console.error('❌ Insert Failed:', error.message);
    console.error('   Hint:', error.hint);
    console.error('   Details:', error.details);
  } else {
    console.log('✅ Insert Success:', data);
    // Cleanup
    await supabaseAdmin.from('customers').delete().eq('id', data[0].id);
    console.log('   (Cleaned up test record)');
  }
}

testInsert();
