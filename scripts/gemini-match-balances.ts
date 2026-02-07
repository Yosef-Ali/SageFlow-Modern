/**
 * Gemini Balance Matcher
 * Uses AI to intelligently match extracted balance values to accounts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
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

// Real balance values extracted from CHARTAR.DAT
const EXTRACTED_BALANCES = [
  79272344.14,
  40648027.16,
  15261155.37,
  7056100.14,
  3549831.94,
  807945.23,
  481933.23,
  216535.31,
  188373.37,
  49101.99,
  19841.48,
  3087.54,
  2959.34,
  1045.56,
  897.88,
  226.00,
  62.16,
  20.04
];

async function main() {
  const companyId = process.argv[2];
  if (!companyId) {
    console.log('Usage: npx tsx scripts/gemini-match-balances.ts <company_id> [--apply]');
    process.exit(1);
  }

  const shouldApply = process.argv.includes('--apply');

  console.log('\n🤖 Gemini Balance Matcher');
  console.log('=========================\n');

  // Get accounts from database
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_number, account_name, type')
    .eq('company_id', companyId)
    .order('account_number');

  if (!accounts || accounts.length === 0) {
    console.error('No accounts found');
    process.exit(1);
  }

  console.log(`📋 Found ${accounts.length} accounts in database`);
  console.log(`💰 ${EXTRACTED_BALANCES.length} unique balance values extracted from PTB\n`);

  // Use Gemini to match balances to accounts
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are an expert accountant helping to match extracted balance values to accounts.

I have ${accounts.length} accounts and ${EXTRACTED_BALANCES.length} balance values extracted from a Peachtree backup file.

EXTRACTED BALANCE VALUES (in ETB - Ethiopian Birr):
${EXTRACTED_BALANCES.map(b => b.toLocaleString('en', { minimumFractionDigits: 2 })).join('\n')}

ACCOUNTS (Number | Name | Type):
${accounts.map(a => `${a.account_number} | ${a.account_name} | ${a.type}`).join('\n')}

YOUR TASK:
Match the balance values to the most appropriate accounts based on:
1. Account TYPE - Assets/Expenses typically have debit (positive) balances, Liabilities/Revenue/Equity typically have credit (shown as positive or negative depending on convention)
2. Account NAME - The name suggests what kind of balance it should have:
   - "Cash", "Bank" accounts: moderate to high positive balances
   - "Receivable" accounts: positive balances (money owed to company)
   - "Payable" accounts: positive balances (money company owes)
   - "Revenue/Sales": high positive balances
   - "Expense" accounts: positive balances
   - "Equipment/Vehicle": high positive balances (fixed assets)
   - "Loan" accounts: high balances (borrowed amounts)
3. MAGNITUDE - Match large balances to accounts that logically should have large balances

Not all accounts need a balance - many might be zero. Use your accounting judgment.

RESPOND WITH JSON ONLY (no markdown, no explanation):
{
  "matches": [
    {"account_number": "1000", "balance": 79272344.14, "reason": "brief reason"},
    ...
  ]
}`;

  console.log('🔮 Asking Gemini to match balances to accounts...\n');

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    const matches = parsed.matches || [];

    console.log(`✅ Gemini matched ${matches.length} accounts with balances:\n`);
    console.log('─'.repeat(85));
    console.log(`${'Acct#'.padEnd(8)} ${'Name'.padEnd(30)} ${'Type'.padEnd(10)} ${'Balance'.padStart(18)} Reason`);
    console.log('─'.repeat(85));

    for (const match of matches.slice(0, 40)) {
      const acc = accounts.find(a => a.account_number === match.account_number);
      if (acc) {
        const balStr = match.balance.toLocaleString('en', { minimumFractionDigits: 2 });
        console.log(
          `${match.account_number.padEnd(8)} ${acc.account_name.slice(0, 30).padEnd(30)} ${acc.type.padEnd(10)} ${balStr.padStart(18)} ${(match.reason || '').slice(0, 20)}`
        );
      }
    }
    console.log('─'.repeat(85));

    // Apply if requested
    if (shouldApply) {
      console.log('\n💾 Applying balances to database...');
      let updated = 0;

      for (const match of matches) {
        if (match.balance && match.account_number) {
          const { error } = await supabase
            .from('chart_of_accounts')
            .update({ balance: match.balance.toString() })
            .eq('company_id', companyId)
            .eq('account_number', match.account_number);

          if (!error) updated++;
        }
      }

      console.log(`✅ Updated ${updated} account balances`);
    } else {
      console.log('\n💡 Run with --apply to save these balances');
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main().catch(console.error);
