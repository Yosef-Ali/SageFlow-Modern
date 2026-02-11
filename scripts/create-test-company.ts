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

async function createCompany() {
  const companyId = '392fa3e5-71ce-4b46-afc2-ea96c61a9131';
  console.log(`Creating Company ID: ${companyId}`);

  const { error } = await supabaseAdmin.from('companies').insert({
    id: companyId,
    name: 'SageFlow Test Company',
    email: 'admin@sageflow.test',
    currency: 'ETB'
  });

  if (error) {
    console.error('❌ Error creating company:', error.message);
  } else {
    console.log('✅ Company Created Successfully');
  }
}

createCompany();
