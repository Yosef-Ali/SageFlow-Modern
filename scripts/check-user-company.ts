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

async function checkUserCompany() {
  const email = 'admin@sageflow.com';
  console.log(`Checking user: ${email}`);

  // Checking both auth.users (if accessible) and public.users
  const { data: user, error } = await supabaseAdmin.from('users').select('id, email, company_id').eq('email', email).single();

  if (error) {
    console.error('❌ Error finding user in public.users:', error.message);
  } else {
    console.log('✅ Found User:', user);
    console.log(`   Linked Company ID: ${user.company_id}`);

    // Check if that company exists
    const { data: company, error: companyError } = await supabaseAdmin.from('companies').select('id, name').eq('id', user.company_id).single();
    if (companyError) {
      console.error('❌ Linked Company NOT FOUND in database!');
    } else {
      console.log(`✅ Company Exists: ${company.name} (${company.id})`);
    }
  }
}

checkUserCompany();
