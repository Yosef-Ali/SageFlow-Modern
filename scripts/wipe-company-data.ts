import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables (relative to scripts/ folder)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// User confirmed they set VITE_SUPABASE_SERVICE_ROLE_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:');
console.log('- VITE_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('- VITE_SUPABASE_SERVICE_ROLE_KEY:', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing credentials in .env.local');
  console.error('Found keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

// Create Admin Client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function wipeCompanyData() {
  const args = process.argv.slice(2);
  const companyId = args[0] || '392fa3e5-71ce-4b46-afc2-ea96c61a9131';

  console.log(`\n🗑️  Starting data wipe for Company ID: ${companyId}`);
  console.log('------------------------------------------------');

  try {
    // 1. Delete Journals (and lines via cascade ideally, but explicit for safety)
    console.log('   ...Deleting Journal Entries & Lines');
    const { data: journals } = await supabaseAdmin.from('journal_entries').select('id').eq('company_id', companyId);
    if (journals && journals.length > 0) {
      const journalIds = journals.map(j => j.id);
      // Delete lines first
      const { error: linesError } = await supabaseAdmin.from('journal_lines').delete().in('journal_entry_id', journalIds);
      if (linesError) console.warn('Warning deleting journal lines:', linesError.message);

      // Delete entries
      const { error: entriesError } = await supabaseAdmin.from('journal_entries').delete().in('id', journalIds);
      if (entriesError) console.warn('Warning deleting journal entries:', entriesError.message);
    }

    // 2. Delete Invoices (and items)
    console.log('   ...Deleting Invoices & Items');
    const { data: invoices } = await supabaseAdmin.from('invoices').select('id').eq('company_id', companyId);
    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map(i => i.id);
      await supabaseAdmin.from('invoice_items').delete().in('invoice_id', invoiceIds);
      await supabaseAdmin.from('invoices').delete().in('id', invoiceIds);
    }

    // 3. Delete Core Entities
    console.log('   ...Deleting Customers');
    await supabaseAdmin.from('customers').delete().eq('company_id', companyId);

    console.log('   ...Deleting Vendors');
    await supabaseAdmin.from('vendors').delete().eq('company_id', companyId);

    console.log('   ...Deleting Departments');
    await supabaseAdmin.from('departments').delete().eq('company_id', companyId);

    console.log('   ...Deleting Inventory Items');
    await supabaseAdmin.from('items').delete().eq('company_id', companyId);

    console.log('   ...Deleting Employees');
    await supabaseAdmin.from('employees').delete().eq('company_id', companyId);

    console.log('   ...Deleting Chart of Accounts');
    await supabaseAdmin.from('chart_of_accounts').delete().eq('company_id', companyId);

    // 4. Verify
    console.log('------------------------------------------------');
    console.log('✅ Data wipe complete. Verifying counts...');

    const { count: customers } = await supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: vendors } = await supabaseAdmin.from('vendors').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: accounts } = await supabaseAdmin.from('chart_of_accounts').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: journalsCount } = await supabaseAdmin.from('journal_entries').select('*', { count: 'exact', head: true }).eq('company_id', companyId);

    console.log(`Remaining Records:`);
    console.log(`- Customers: ${customers}`);
    console.log(`- Vendors: ${vendors}`);
    console.log(`- Accounts: ${accounts}`);
    console.log(`- Journals: ${journalsCount}`);

    if ((customers || 0) + (vendors || 0) + (accounts || 0) + (journalsCount || 0) === 0) {
      console.log('\n✨ Company is clean ready for re-import.');
    } else {
      console.warn('\n⚠️  Some records remain. Check foreign key constraints or manual deletions needed.');
    }

  } catch (error) {
    console.error('❌ Error during wipe:', error);
    process.exit(1);
  }
}

wipeCompanyData();
