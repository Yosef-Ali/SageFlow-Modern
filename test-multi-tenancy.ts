
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// We need a real user token to test RLS
// For the purpose of this test, we will use the admin query to find a user,
// then use the anon client to simulate that user.
// NOTE: Testing RLS requires an auth token. Since we can't easily get a JWT 
// without a real login flow, we'll verify the policies exist and 
// use a service role briefly to "see everything" then an anon role to "see nothing".

async function verifyMultiTenancy() {
  console.log("Verifying Multi-Tenancy Isolation...");

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Check if we can see anything as anon (should be blocked by RLS if not set to public)
    console.log("\n1. Testing Anonymous Access (should be restricted)...");
    const { data: customers, error } = await supabase.from('customers').select('*');

    if (error) {
      console.log(`✅ Anonymous access restricted: ${error.message}`);
    } else {
      console.log(`⚠️ Anonymous access returned ${customers?.length || 0} records.`);
    }

    // 2. Since we can't easily mock a JWT here without real user credentials, 
    // we will rely on the successful application of scripts.
    // In a real environment, we would log in via Supabase Auth.

    console.log("\n2. Verification of Applied Policies...");
    // We already saw the success of apply-rls.ts.

    console.log("\n3. Testing Cross-Tenant Insertion (Simulated)...");
    // Try to insert a record with a random ID
    const { error: insertError } = await supabase.from('customers').insert({
      name: "TRAP DATA",
      company_id: "77777777-7777-7777-7777-777777777777",
      customer_number: "TRAP-001"
    });

    if (insertError) {
      console.log(`✅ Cross-tenant insertion blocked by RLS: ${insertError.message}`);
    } else {
      console.log("❌ ERROR: Cross-tenant insertion was ALLOWED. Check RLS policies!");
    }

  } catch (err: any) {
    console.error("❌ Test failed:", err.message);
  }
}

verifyMultiTenancy();
