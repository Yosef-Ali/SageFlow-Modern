
import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const projectRef = 'qjzkesufytfuaszdkucw'; // From VITE_SUPABASE_URL
const suspiciousString = 'CBvWXyRI9z6RbxOS'; // The string found in the username field

// Constructing the likely intended connection string
const testUrl = `postgresql://postgres.${projectRef}:${suspiciousString}@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`;

async function testConnection() {
  console.log(`Testing with potential password: ${suspiciousString.substring(0, 4)}...`);
  console.log(`Connecting to project ref: ${projectRef}`);

  const client = new Client({ connectionString: testUrl });

  try {
    await client.connect();
    console.log(`✅ SUCCESS! The string '${suspiciousString}' is indeed the correct password.`);
    await client.end();
  } catch (err: any) {
    console.error(`❌ Connection failed with potential password:`, err.message);
    if (err.code) console.error(`   Code: ${err.code}`);
  }
}

testConnection();
