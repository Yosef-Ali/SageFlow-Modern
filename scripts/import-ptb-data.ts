/**
 * Import PTB Extracted Data to SageFlow
 * 
 * Usage: npx tsx scripts/import-ptb-data.ts <company_id> [--wipe]
 * 
 * Reads data from ptb-output/sageflow_import.json (created by Docker extractor)
 * and imports accounts, customers, and vendors into Supabase.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create Admin Client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface ImportData {
  accounts: Array<{
    account_number: string;
    account_name: string;
    type?: string;
    balance?: string;
  }>;
  customers: Array<{ name: string }>;
  vendors: Array<{ name: string }>;
}

async function runImport() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: npx tsx scripts/import-ptb-data.ts <company_id> [--wipe]');
    console.log('\nReads from: ptb-output/sageflow_import.json');
    console.log('Options:');
    console.log('  --wipe  Clear existing company data before importing');
    process.exit(1);
  }

  const companyId = args[0];
  const forceWipe = args.includes('--wipe');
  const dataPath = path.resolve(__dirname, '../ptb-output/sageflow_import.json');

  console.log('\n🚀 SageFlow PTB Data Importer');
  console.log('===============================');
  console.log(`📂 Data file: ${dataPath}`);
  console.log(`🏢 Company ID: ${companyId}`);

  // Check if data file exists
  if (!fs.existsSync(dataPath)) {
    console.error('\n❌ Error: ptb-output/sageflow_import.json not found');
    console.error('   Run ./extract-ptb.sh <your.ptb> first to extract data');
    process.exit(1);
  }

  try {
    // Load extracted data
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data: ImportData = JSON.parse(rawData);

    console.log(`\n📊 Data to import:`);
    console.log(`   Accounts: ${data.accounts?.length || 0}`);
    console.log(`   Customers: ${data.customers?.length || 0}`);
    console.log(`   Vendors: ${data.vendors?.length || 0}`);

    // Wipe existing data if requested
    if (forceWipe) {
      console.log('\n⚠️  --wipe flag detected. Clearing existing company data...');

      // Delete in order to respect foreign key constraints
      const { data: journals } = await supabaseAdmin.from('journal_entries').select('id').eq('company_id', companyId);
      if (journals?.length) {
        await supabaseAdmin.from('journal_lines').delete().in('journal_entry_id', journals.map(j => j.id));
        await supabaseAdmin.from('journal_entries').delete().eq('company_id', companyId);
      }

      await supabaseAdmin.from('customers').delete().eq('company_id', companyId);
      await supabaseAdmin.from('vendors').delete().eq('company_id', companyId);
      await supabaseAdmin.from('chart_of_accounts').delete().eq('company_id', companyId);

      console.log('✅ Existing data cleared');
    }

    let importedCount = 0;

    // === 1. Import Chart of Accounts ===
    if (data.accounts?.length > 0) {
      console.log('\n📚 Importing Chart of Accounts...');

      // Filter out bad data and deduplicate
      const seen = new Set<string>();
      const validAccounts = data.accounts.filter(acc => {
        if (!acc.account_number || !acc.account_name) return false;
        if (acc.account_name.length < 3) return false;

        const key = acc.account_number.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const records = validAccounts.map(acc => ({
        id: crypto.randomUUID(),
        company_id: companyId,
        account_number: acc.account_number,
        account_name: acc.account_name,
        type: acc.type || 'ASSET',
        balance: acc.balance || '0',
        is_active: true
      }));

      if (records.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < records.length; i += 100) {
          const batch = records.slice(i, i + 100);
          const { error } = await supabaseAdmin.from('chart_of_accounts').insert(batch);
          if (error) {
            console.error(`   Error inserting accounts batch ${i / 100 + 1}:`, error.message);
          }
        }
        console.log(`   ✅ Imported ${records.length} accounts`);
        importedCount += records.length;
      }
    }

    // === 2. Import Customers ===
    if (data.customers?.length > 0) {
      console.log('\n👥 Importing Customers...');

      const seen = new Set<string>();
      const validCustomers = data.customers.filter(cust => {
        if (!cust.name || cust.name.length < 3) return false;
        const key = cust.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const records = validCustomers.map((cust, i) => ({
        id: crypto.randomUUID(),
        company_id: companyId,
        customer_number: `CUST-${1000 + i}`,
        name: cust.name,
        email: `${cust.name.replace(/\s/g, '.').toLowerCase()}@example.com`,
        is_active: true
      }));

      if (records.length > 0) {
        const { error } = await supabaseAdmin.from('customers').insert(records);
        if (error) {
          console.error('   Error inserting customers:', error.message);
        } else {
          console.log(`   ✅ Imported ${records.length} customers`);
          importedCount += records.length;
        }
      }
    }

    // === 3. Import Vendors ===
    if (data.vendors?.length > 0) {
      console.log('\n🏭 Importing Vendors...');

      const seen = new Set<string>();
      const validVendors = data.vendors.filter(vend => {
        if (!vend.name || vend.name.length < 3) return false;
        const key = vend.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const records = validVendors.map((vend, i) => ({
        id: crypto.randomUUID(),
        company_id: companyId,
        vendor_number: `VEND-${1000 + i}`,
        name: vend.name,
        email: `${vend.name.replace(/\s/g, '.').toLowerCase()}@supplier.com`,
        is_active: true
      }));

      if (records.length > 0) {
        const { error } = await supabaseAdmin.from('vendors').insert(records);
        if (error) {
          console.error('   Error inserting vendors:', error.message);
        } else {
          console.log(`   ✅ Imported ${records.length} vendors`);
          importedCount += records.length;
        }
      }
    }

    // === Summary ===
    console.log('\n===============================');
    console.log(`🎉 Import Complete! Total records: ${importedCount}`);
    console.log('\nNext steps:');
    console.log('  1. Open SageFlow UI');
    console.log('  2. Go to Settings > Chart of Accounts to see imported accounts');
    console.log('  3. Go to Customers/Vendors pages to see imported data');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

runImport();
