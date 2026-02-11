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
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkCompany() {
  const companyId = '6b891b90-b3d8-44d6-9b61-d7083b8520c4';
  console.log(`Checking for Logged-In Company ID: ${companyId}`);

  const { data, error } = await supabaseAdmin.from('companies').select('*').eq('id', companyId).single();

  if (error) {
    console.error('❌ Error or Company Not Found:', error.message);
  } else {
    console.log('✅ Company Exists:', data.name);
  }
}

checkCompany();
