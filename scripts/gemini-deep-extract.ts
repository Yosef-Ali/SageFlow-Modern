/**
 * Deep PTB Extraction with Gemini
 * Sends larger context to Gemini for intelligent pattern recognition
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const geminiKey = process.env.GEMINI_API_KEY!;
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const genAI = new GoogleGenerativeAI(geminiKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Get current accounts from database
async function getCurrentAccounts(companyId: string) {
  const { data } = await supabase
    .from('chart_of_accounts')
    .select('account_number, account_name, type')
    .eq('company_id', companyId)
    .order('account_number');
  return data || [];
}

// Find all readable strings near currency-like values
function analyzeChartData(data: Buffer): { account: string; nearbyValues: number[] }[] {
  const results: { account: string; nearbyValues: number[] }[] = [];

  // Find account name patterns
  const accountRegex = /[A-Z][a-z]+(?:\s+[A-Za-z]+){0,4}/g;
  const text = data.toString('latin1');

  let match;
  while ((match = accountRegex.exec(text)) !== null) {
    const name = match[0];
    if (name.length >= 5 && name.length <= 40) {
      const pos = match.index;

      // Look for numeric values in surrounding 100 bytes
      const nearbyValues: number[] = [];
      const start = Math.max(0, pos - 20);
      const end = Math.min(data.length, pos + name.length + 80);

      for (let i = start; i < end - 4; i += 2) {
        try {
          // Try int32 as cents
          const val = data.readInt32LE(i) / 100;
          if (Math.abs(val) >= 100 && Math.abs(val) <= 50000000) {
            nearbyValues.push(Math.round(val * 100) / 100);
          }
        } catch {}
      }

      if (nearbyValues.length > 0) {
        // Remove duplicates and sort by absolute value
        const unique = [...new Set(nearbyValues)].sort((a, b) => Math.abs(a) - Math.abs(b));
        results.push({ account: name.trim(), nearbyValues: unique.slice(0, 5) });
      }
    }
  }

  return results;
}

async function extractWithGemini(ptbPath: string, companyId: string) {
  console.log('\n🔮 Deep PTB Balance Extraction with Gemini');
  console.log('==========================================\n');

  // Load PTB
  const fileBuffer = fs.readFileSync(ptbPath);
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileBuffer);

  // Get CHART.DAT
  const chartFile = Object.keys(loadedZip.files).find(n => n.toUpperCase().includes('CHART.DAT'));
  if (!chartFile) throw new Error('CHART.DAT not found');

  const chartData = Buffer.from(await loadedZip.files[chartFile].async('uint8array'));
  console.log(`📂 Loaded CHART.DAT (${chartData.length} bytes)`);

  // Get current accounts from DB
  const dbAccounts = await getCurrentAccounts(companyId);
  console.log(`📋 Found ${dbAccounts.length} accounts in database\n`);

  // Analyze binary data
  const analysisResults = analyzeChartData(chartData);
  console.log(`🔍 Found ${analysisResults.length} potential account-value pairs\n`);

  // Match with database accounts
  const matchedData: { accountNumber: string; accountName: string; type: string; candidates: number[] }[] = [];

  for (const dbAcc of dbAccounts) {
    // Find matching analysis result
    const match = analysisResults.find(r =>
      dbAcc.account_name.toLowerCase().includes(r.account.toLowerCase()) ||
      r.account.toLowerCase().includes(dbAcc.account_name.toLowerCase().split(' ')[0])
    );

    matchedData.push({
      accountNumber: dbAcc.account_number,
      accountName: dbAcc.account_name,
      type: dbAcc.type,
      candidates: match?.nearbyValues || []
    });
  }

  // Send to Gemini for intelligent selection
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are an expert accountant analyzing data from a Peachtree accounting backup.

I have extracted account information and potential balance values. For each account, I found nearby numeric values in the binary file. Your task is to select the most likely OPENING BALANCE for each account.

ACCOUNTING RULES:
- ASSET accounts (Cash, Receivables, Inventory, Equipment): Usually POSITIVE balances
- LIABILITY accounts (Payables, Loans, Accruals): Usually NEGATIVE (credit) balances shown as positive
- EQUITY accounts (Capital, Retained Earnings): Can be positive or negative
- REVENUE accounts (Sales, Income): Usually POSITIVE (credit)
- EXPENSE accounts (Costs, Rent, Utilities): Usually POSITIVE (debit)

For a small/medium Ethiopian business, typical balances might be:
- Cash: 10,000 - 500,000 ETB
- Receivables: 50,000 - 2,000,000 ETB
- Inventory: 100,000 - 5,000,000 ETB
- Payables: 50,000 - 1,000,000 ETB
- Equipment: 100,000 - 10,000,000 ETB
- Revenue/Expenses: varies widely

DATA (Account Number | Name | Type | Candidate Values):
${matchedData.slice(0, 50).map(d =>
  `${d.accountNumber} | ${d.accountName} | ${d.type} | ${d.candidates.length > 0 ? d.candidates.join(', ') : 'NO VALUES FOUND'}`
).join('\n')}

Based on the account type and typical ranges, select the most reasonable balance for each account.
If no candidates look reasonable, use 0.

RESPOND WITH ONLY A JSON OBJECT (no markdown, no explanation):
{
  "balances": {
    "account_number": balance_value,
    ...
  }
}`;

  console.log('🤖 Asking Gemini to analyze and select balances...\n');

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    const balances = parsed.balances || {};

    // Display results
    console.log('💰 Gemini-Selected Balances:');
    console.log('─'.repeat(70));
    console.log(`${'Acct#'.padEnd(8)} ${'Name'.padEnd(30)} ${'Type'.padEnd(10)} ${'Balance'.padStart(15)}`);
    console.log('─'.repeat(70));

    const entries = Object.entries(balances).slice(0, 40);
    for (const [accNum, balance] of entries) {
      const acc = dbAccounts.find(a => a.account_number === accNum);
      if (acc) {
        const balStr = (balance as number).toLocaleString('en', { minimumFractionDigits: 2 });
        console.log(`${accNum.padEnd(8)} ${acc.account_name.slice(0, 30).padEnd(30)} ${acc.type.padEnd(10)} ${balStr.padStart(15)}`);
      }
    }
    console.log('─'.repeat(70));

    // Ask to apply
    const shouldApply = process.argv.includes('--apply');

    if (shouldApply) {
      console.log('\n💾 Applying balances to database...');
      let updated = 0;

      for (const [accNum, balance] of Object.entries(balances)) {
        if (typeof balance === 'number' && balance !== 0) {
          const { error } = await supabase
            .from('chart_of_accounts')
            .update({ balance: balance.toString() })
            .eq('company_id', companyId)
            .eq('account_number', accNum);

          if (!error) updated++;
        }
      }

      console.log(`✅ Updated ${updated} account balances`);
    } else {
      console.log('\n💡 Run with --apply to save these balances to the database');
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx scripts/gemini-deep-extract.ts <company_id> <ptb_file> [--apply]');
  process.exit(1);
}

extractWithGemini(args[1], args[0]).catch(console.error);
