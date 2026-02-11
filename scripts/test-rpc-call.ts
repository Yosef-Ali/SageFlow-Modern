import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service key to bypass RLS for this test, or anon key to simulate frontend?
// The frontend uses the authenticated user's session.
// To simulate frontend exactly, we should use the user's token, but we don't have it easily.
// However, the error is an FK violation, which shouldn't depend on who calls it if the ID is wrong.
// Let's use service key to verify if it works at all first.
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testRpc() {
  const companyId = '6b891b90-b3d8-44d6-9b61-d7083b8520c4';
  console.log(`Testing RPC import_ptb_v1 with Company ID: ${companyId}`);

  // Minimal payload
  const payload = {
    customers: [
      {
        id: 'TEST-CUST-001',
        name: 'Test Customer RPC',
        email: 'test@rpc.com',
        phone: '1234567890'
      }
    ]
  };

  const { data, error } = await supabaseAdmin.rpc('import_ptb_v1', {
    p_company_id: companyId,
    p_data: payload
  });

  if (error) {
    console.error('❌ RPC Failed:', error.message);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
  } else {
    console.log('✅ RPC Success:', data);
  }
}

testRpc();
