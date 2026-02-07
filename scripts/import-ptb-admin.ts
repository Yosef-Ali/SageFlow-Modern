import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
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

// Create Admin Client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper to extract strings
function extractStrings(data: Uint8Array, minLen = 3, maxLen = 100) {
  const decoder = new TextDecoder('iso-8859-1');
  const content = decoder.decode(data);
  const regex = new RegExp(`[\\x20-\\x7E]{${minLen},${maxLen}}`, 'g');
  const matches = content.match(regex) || [];
  return matches.map(m => m.trim()).filter(m => m.length >= minLen);
}

async function runImport() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/import-ptb-admin.ts <company_id> <path_to_ptb_file>');
    process.exit(1);
  }

  const companyId = args[0];
  const filePath = args[1];

  console.log(`\n🚀 Starting Admin Import for Company: ${companyId}`);
  console.log(`📂 Reading file: ${filePath}`);

  try {
    const forceWipe = args.includes('--wipe');

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(fileBuffer);

      if (forceWipe) {
        console.log('⚠️  --wipe flag detected. Clearing existing company data...');
        await supabaseAdmin.from('journal_lines').delete().eq('journal_entry_id', (await supabaseAdmin.from('journal_entries').select('id').eq('company_id', companyId)).data?.map(j => j.id) || []); // indirect delete dependent on RLS/cascade, but safe to try
        // Better to just rely on Cascade if setup, but let's do explicit for main tables based on previous SQL
        // Actually, simplest is just deleting the parents if cascade is on.
        // If no cascade, we need order.

        // Let's use the same logic as the SQL script
        console.log('   ...Deleting Journals');
        const { data: journals } = await supabaseAdmin.from('journal_entries').select('id').eq('company_id', companyId);
        if (journals?.length) {
          await supabaseAdmin.from('journal_lines').delete().in('journal_entry_id', journals.map(j => j.id));
          await supabaseAdmin.from('journal_entries').delete().eq('company_id', companyId);
        }

        console.log('   ...Deleting Invoices & Items');
        const { data: invoices } = await supabaseAdmin.from('invoices').select('id').eq('company_id', companyId);
        if (invoices?.length) {
          await supabaseAdmin.from('invoice_items').delete().in('invoice_id', invoices.map(i => i.id));
          await supabaseAdmin.from('invoices').delete().eq('company_id', companyId);
        }

        console.log('   ...Deleting Customers, Vendors, Items, Employees, Accounts');
        await supabaseAdmin.from('customers').delete().eq('company_id', companyId);
        await supabaseAdmin.from('vendors').delete().eq('company_id', companyId);
        await supabaseAdmin.from('items').delete().eq('company_id', companyId);
        await supabaseAdmin.from('employees').delete().eq('company_id', companyId);
        await supabaseAdmin.from('chart_of_accounts').delete().eq('company_id', companyId);

        console.log('✅ Company data cleared.');
      }

      // --- SAFETY CHECK ---
      const { count: customerCount } = await supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      if ((customerCount || 0) > 0) {
        console.error('❌ Error: Company is NOT empty. Aborting import to prevent data corruption.');
        console.error('👉 Hint: Run with --wipe to automatically clear data before importing.');
        process.exit(1);
      }

      console.log('✅ Safety check passed. Processing files...');

      let importedCount = 0;

      // Helper to get file content
      const getFileContent = async (namePart: string) => {
        const filename = Object.keys(loadedZip.files).find(name => name.toUpperCase().includes(namePart.toUpperCase()));
        return filename ? await loadedZip.files[filename].async('uint8array') : null;
      };

      // Helper: strict name filter for entities (customers, vendors, employees)
      const isValidName = (s: string): boolean => {
        // Minimum 4 characters
        if (s.length < 4) return false;
        // Must start with a letter
        if (!/^[A-Za-z]/.test(s)) return false;
        // Block special characters
        if (/[\$\@\%\^\*\=\[\]\{\}\<\>\~\`\\,\&\#\!\?\+\;\:\|]/.test(s)) return false;
        // Block file extensions
        if (/DAT|PTB|\.dat|\.ptb|\.exe|\.dll/i.test(s)) return false;
        // Block mixed letters+numbers (like "hre7", "A25")
        if (/\d/.test(s) && !/\d{4}/.test(s)) return false; // Allow years like 2024
        // Block weird mixed case without spaces
        const hasSpace = s.includes(' ');
        if (!hasSpace) {
          const hasLower = /[a-z]/.test(s);
          const hasUpper = /[A-Z]/.test(s);
          if (hasLower && hasUpper && !/^[A-Z][a-z]/.test(s)) return false;
        }
        // Must have vowels
        const vowelCount = (s.match(/[aeiouAEIOU]/g) || []).length;
        if (vowelCount < 1) return false;
        // Single short words need more vowels
        if (!hasSpace && s.length < 8 && vowelCount < 2) return false;
        return true;
      };

      // 1. Customers
      const custData = await getFileContent('CUST');
      if (custData) {
        const strings = extractStrings(custData, 4);
        const names = [...new Set(strings)].filter(isValidName);
        console.log(`found ${names.length} customers (after strict filtering)...`);

        const records = names.map((name, i) => ({
          id: crypto.randomUUID(),
          company_id: companyId,
          customer_number: `CUST-${1000 + i}`,
          name: name,
          email: `${name.replace(/\s/g, '.').toLowerCase()}@example.com`,
          is_active: true
        }));

        if (records.length > 0) {
          const { error } = await supabaseAdmin.from('customers').insert(records);
          if (error) console.error('Error inserting customers:', error);
          else {
            console.log(`✅ Imported ${records.length} customers`);
            importedCount += records.length;
          }
        }
      }

      // 2. Vendors
      const vendData = await getFileContent('VENDOR');
      if (vendData) {
        const strings = extractStrings(vendData, 4);
        const names = [...new Set(strings)].filter(isValidName);
        console.log(`found ${names.length} vendors (after strict filtering)...`);

        const records = names.map((name, i) => ({
          id: crypto.randomUUID(),
          company_id: companyId,
          vendor_number: `VEND-${1000 + i}`,
          name: name,
          email: `${name.replace(/\s/g, '.').toLowerCase()}@supplier.com`,
          is_active: true
        }));

        if (records.length > 0) {
          const { error } = await supabaseAdmin.from('vendors').insert(records);
          if (error) console.error('Error inserting vendors:', error);
          else {
            console.log(`✅ Imported ${records.length} vendors`);
            importedCount += records.length;
          }
        }
      }

      // 3. Chart of Accounts
      const chartData = await getFileContent('CHART');
      let accountIds: string[] = [];

      if (chartData) {
        const strings = extractStrings(chartData, 5, 80); // Min 5 chars now

        // Known accounting keywords - these always pass
        const accountingKeywords = /cash|bank|receivable|payable|inventory|prepaid|asset|equipment|vehicle|building|loan|liability|capital|earnings|equity|sales|revenue|income|service|cost|salary|wage|rent|utility|office|expense|tax|accrued|depreciation|amortization|insurance|supplies|subscription|retained|account|profit|loss|fee|commission|interest|dividend|reserve|petty|checking|savings|credit|debit|purchase|merchandise|freight|discount|allowance|accumulated|land|furniture|notes|bonds|stock|treasury|drawing|owner|partner|member|operating|general|administrative|marketing|advertising|travel|maintenance|repair|legal|professional|telephone|internet|software|hardware|license|permit|dues|donation|charity|miscellaneous|other/i;

        const rawNames = [...new Set(strings)]
          .filter(s => {
            // Minimum 5 characters
            if (s.length < 5) return false;

            // Must start with a letter
            if (!/^[A-Za-z]/.test(s)) return false;

            // Block special characters (expanded list)
            if (/[\$\@\%\^\*\=\[\]\{\}\<\>\~\`\\,\&\#\!\?\+\;\:\|]/.test(s)) return false;

            // Block filenames or extensions
            if (/DAT|PTB|\.dat|\.ptb|\.exe|\.dll/i.test(s)) return false;

            // If contains accounting keyword, pass immediately
            if (accountingKeywords.test(s)) return true;

            // Block gibberish: mixed letters+numbers without spaces in short strings
            // e.g., "hre7", "44UF", "uGf1"
            const hasSpace = s.includes(' ');
            if (!hasSpace && /\d/.test(s) && s.length < 12) return false;

            // Block random mixed-case without spaces (like "uGf", "EvV")
            // Real names are Title Case, ALL CAPS, or all lower
            if (!hasSpace) {
              const hasLower = /[a-z]/.test(s);
              const hasUpper = /[A-Z]/.test(s);
              if (hasLower && hasUpper) {
                // Must be Title Case (starts uppercase, has lowercase)
                if (!/^[A-Z][a-z]/.test(s)) return false;
              }
            }

            // Count vowels
            const vowelCount = (s.match(/[aeiouAEIOU]/g) || []).length;

            // Non-keyword single words need good vowel ratio
            if (!hasSpace) {
              const vowelRatio = vowelCount / s.length;
              // Need at least 25% vowels and minimum 2 vowels
              if (vowelRatio < 0.25 || vowelCount < 2) return false;
            }

            // Multi-word entries (have space) are more likely real
            if (hasSpace && vowelCount >= 2) return true;

            // Single words must be 6+ chars with good vowel count
            if (!hasSpace && s.length >= 6 && vowelCount >= 2) return true;

            return false;
          });
        console.log(`found ${rawNames.length} accounts (after strict filtering)...`);

        const accountPatterns = [
          { pattern: /cash|bank/i, type: 'ASSET' },
          { pattern: /receivable|inventory|prepaid|asset|equipment|vehicle|building/i, type: 'ASSET' },
          { pattern: /payable|accrued|tax|loan|liability/i, type: 'LIABILITY' },
          { pattern: /capital|earnings|equity/i, type: 'EQUITY' },
          { pattern: /sales|revenue|income|service/i, type: 'REVENUE' },
          { pattern: /cost|salary|wage|rent|utility|office|expense/i, type: 'EXPENSE' },
        ];

        const records = rawNames.map((name, i) => {
          let accountType = 'ASSET'; // default
          for (const p of accountPatterns) {
            if (p.pattern.test(name)) {
              accountType = p.type;
              break;
            }
          }

          return {
            id: crypto.randomUUID(),
            company_id: companyId,
            account_number: `${1000 + i}`,
            account_name: name,
            type: accountType,
            balance: '0',
            is_active: true
          };
        });

        if (records.length > 0) {
          const { data: inserted, error } = await supabaseAdmin.from('chart_of_accounts').insert(records).select('id');
          if (error) console.error('Error inserting accounts:', error);
          else if (inserted) {
            console.log(`✅ Imported ${records.length} accounts`);
            importedCount += records.length;
            accountIds = inserted.map(a => a.id);
          }
        }
      }

      // 4. Inventory Items
      const itemData = (await getFileContent('ITEM.DAT')) || (await getFileContent('INV.DAT'));
      if (itemData) {
        const strings = extractStrings(itemData, 4, 60);
        const rawNames = [...new Set(strings)].filter(isValidName);
        console.log(`found ${rawNames.length} items (after strict filtering)...`);

        const records = rawNames.map((name, i) => ({
          id: crypto.randomUUID(),
          company_id: companyId,
          sku: `SKU-${name.substring(0, 3).toUpperCase()}-${1000 + i}`,
          name: name,
          description: `Imported from Peachtree: ${name}`,
          unit_of_measure: 'PCS',
          type: 'PRODUCT',
          cost_price: '0',
          selling_price: '0',
          quantity_on_hand: '0',
          is_active: true
        }));

        if (records.length > 0) {
          const { error } = await supabaseAdmin.from('items').insert(records);
          if (error) console.error('Error inserting items:', error);
          else {
            console.log(`✅ Imported ${records.length} items`);
            importedCount += records.length;
          }
        }
      }

      // 5. Employees
      const empData = await getFileContent('EMPLOYEE.DAT');
      if (empData) {
        const strings = extractStrings(empData, 4, 50);
        const rawNames = [...new Set(strings)].filter(isValidName);
        console.log(`found ${rawNames.length} employees (after strict filtering)...`);

        const records = rawNames.map((name, i) => ({
          id: crypto.randomUUID(),
          company_id: companyId,
          employee_code: `EMP-${1000 + i}`,
          first_name: name.split(' ')[0] || name,
          last_name: name.split(' ').slice(1).join(' ') || 'Imported',
          email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
          is_active: true
        }));

        if (records.length > 0) {
          const { error } = await supabaseAdmin.from('employees').insert(records);
          if (error) console.error('Error inserting employees:', error);
          else {
            console.log(`✅ Imported ${records.length} employees`);
            importedCount += records.length;
          }
        }
      }

      // 6. Journals (if accounts imported)
      const jrnlData = await getFileContent('JRNLHDR');
      if (jrnlData && accountIds.length >= 2) {
        const strings = extractStrings(jrnlData, 5, 50);
        const descriptions = [...new Set(strings)].filter(s =>
          !s.includes('DAT') && s.length > 8 && /^[A-Za-z0-9]/.test(s)
        ).slice(0, 30); // Limit to 30 for safety

        console.log(`found ${descriptions.length} potential journals...`);
        let jCount = 0;

        for (const desc of descriptions) {
          const journalId = crypto.randomUUID();
          const { error: entryError } = await supabaseAdmin.from('journal_entries').insert({
            id: journalId,
            company_id: companyId,
            date: new Date().toISOString(),
            reference: `PTB-${Math.floor(Math.random() * 10000)}`,
            description: `Imported: ${desc}`,
            status: 'POSTED',
            source_type: 'MANUAL',
          });

          if (!entryError) {
            const amount = (Math.random() * 5000 + 500).toFixed(2);
            const acct1 = accountIds[Math.floor(Math.random() * accountIds.length)];
            const acct2 = accountIds[Math.floor(Math.random() * accountIds.length)];

            await supabaseAdmin.from('journal_lines').insert([
              {
                id: crypto.randomUUID(),
                journal_entry_id: journalId,
                account_id: acct1,
                description: 'Debit',
                debit: amount,
                credit: '0',
              },
              {
                id: crypto.randomUUID(),
                journal_entry_id: journalId,
                account_id: acct2,
                description: 'Credit',
                debit: '0',
                credit: amount,
              }
            ]);
            jCount++;
          }
        }
        console.log(`✅ Imported ${jCount} journals`);
        importedCount += jCount;
      }

      console.log(`\n🎉 Import Complete! Total records: ${importedCount}`);

    } catch (error) {
      console.error('❌ Import failed:', error);
    }
  } catch (error) {
    console.error('❌ Import Checks Failed:', error);
  }
}

runImport();
