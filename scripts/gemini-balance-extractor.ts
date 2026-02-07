/**
 * Gemini-Powered PTB Balance Extractor
 * Uses Google Gemini Flash to analyze Peachtree binary data and extract account balances
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

// Initialize APIs
const geminiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!geminiKey) {
  console.error('Error: GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface AccountData {
  accountNumber: string;
  accountName: string;
  hexContext: string;
  numericCandidates: { offset: number; int32: number; int64: number; double: number }[];
}

// Extract numeric interpretations from binary data
function extractNumericCandidates(buffer: Buffer): { offset: number; int32: number; int64: number; double: number }[] {
  const candidates: { offset: number; int32: number; int64: number; double: number }[] = [];

  for (let offset = 0; offset < Math.min(buffer.length - 8, 48); offset += 2) {
    try {
      const int32 = buffer.readInt32LE(offset) / 100; // as cents
      const int64 = Number(buffer.readBigInt64LE(offset)) / 100;
      const double = buffer.readDoubleLE(offset);

      candidates.push({
        offset,
        int32: Math.round(int32 * 100) / 100,
        int64: Math.round(int64 * 100) / 100,
        double: Math.round(double * 100) / 100
      });
    } catch {
      // Skip invalid reads
    }
  }

  return candidates;
}

// Extract account records from CHART.DAT
function extractAccountRecords(chartData: Buffer): AccountData[] {
  const records: AccountData[] = [];
  const seen = new Set<string>();

  let i = 0;
  while (i < chartData.length - 200) {
    if (chartData[i] === 0x04 && chartData[i + 1] === 0x00) {
      const potentialNum = chartData.subarray(i + 2, i + 6).toString('ascii');

      if (/^\d{4}$/.test(potentialNum)) {
        for (let j = 8; j < 60; j++) {
          const nameLen = chartData[i + j];
          if (nameLen >= 5 && nameLen <= 50) {
            const nameStart = i + j + 4;
            if (nameStart + nameLen <= chartData.length) {
              const potentialName = chartData.subarray(nameStart, nameStart + nameLen).toString('ascii');

              if (/^[A-Za-z]/.test(potentialName) &&
                  potentialName.split('').filter(c => /[a-zA-Z]/.test(c)).length >= 3) {

                const key = `${potentialNum}-${potentialName.trim()}`;
                if (!seen.has(key)) {
                  seen.add(key);

                  const contextStart = nameStart + nameLen;
                  const contextEnd = Math.min(chartData.length, contextStart + 64);
                  const binaryContext = chartData.subarray(contextStart, contextEnd);

                  records.push({
                    accountNumber: potentialNum,
                    accountName: potentialName.trim(),
                    hexContext: binaryContext.toString('hex'),
                    numericCandidates: extractNumericCandidates(binaryContext)
                  });
                }
                i = nameStart + nameLen;
                break;
              }
            }
          }
        }
      }
    }
    i++;
  }

  return records;
}

// Use Gemini to analyze patterns and identify balances
async function analyzeWithGemini(records: AccountData[]): Promise<Map<string, number>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Prepare sample data for Gemini
  const sampleRecords = records.slice(0, 25); // Send 25 records for analysis

  const prompt = `You are analyzing accounting data extracted from a Peachtree backup file.

For each account below, I'm showing:
- Account number and name
- Hex dump of binary data after the account name (potential balance location)
- Multiple numeric interpretations at different byte offsets (int32/100, int64/100, double)

Your task: Identify which interpretation and offset most likely represents the ACCOUNT BALANCE.

Accounting context:
- Account balances are typically positive for Assets, Expenses
- Account balances are typically negative (credit) for Liabilities, Equity, Revenue
- Values should be reasonable (typically between 0 and 10,000,000 for a small/medium business)
- Look for consistency across similar account types

DATA:
${sampleRecords.map((r, idx) => `
[Account ${idx + 1}]
Number: ${r.accountNumber}
Name: ${r.accountName}
Hex: ${r.hexContext.substring(0, 64)}
Numeric candidates:
${r.numericCandidates.slice(0, 8).map(c =>
  `  Offset ${c.offset}: int32=${c.int32.toLocaleString()}, double=${c.double.toLocaleString()}`
).join('\n')}
`).join('\n')}

RESPOND WITH JSON ONLY (no markdown, no explanation):
{
  "bestOffset": <number>,
  "bestType": "int32" or "double",
  "balances": {
    "<accountNumber>": <balance>,
    ...
  },
  "confidence": "high" or "medium" or "low"
}`;

  console.log('🤖 Sending data to Gemini Flash for analysis...\n');

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`📊 Gemini Analysis Results:`);
    console.log(`   Best offset: ${parsed.bestOffset}`);
    console.log(`   Best type: ${parsed.bestType}`);
    console.log(`   Confidence: ${parsed.confidence}\n`);

    // Apply the pattern to ALL records
    const balanceMap = new Map<string, number>();

    // First, use Gemini's direct suggestions
    if (parsed.balances) {
      for (const [accNum, balance] of Object.entries(parsed.balances)) {
        if (typeof balance === 'number' && Math.abs(balance) < 100000000) {
          balanceMap.set(accNum, balance);
        }
      }
    }

    // Then apply the discovered pattern to remaining records
    const bestOffset = parsed.bestOffset || 0;
    const bestType = parsed.bestType || 'int32';

    for (const record of records) {
      if (!balanceMap.has(record.accountNumber)) {
        const candidate = record.numericCandidates.find(c => c.offset === bestOffset);
        if (candidate) {
          const value = bestType === 'double' ? candidate.double : candidate.int32;
          if (Math.abs(value) < 100000000) {
            balanceMap.set(record.accountNumber, value);
          }
        }
      }
    }

    return balanceMap;

  } catch (error: any) {
    console.error('Gemini API error:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/gemini-balance-extractor.ts <company_id> <ptb_file> [--apply]');
    process.exit(1);
  }

  const companyId = args[0];
  const ptbPath = args[1];
  const shouldApply = args.includes('--apply');

  console.log('\n🔮 Gemini-Powered PTB Balance Extractor');
  console.log('=========================================\n');

  // Load PTB file
  console.log(`📂 Loading: ${ptbPath}`);
  const fileBuffer = fs.readFileSync(ptbPath);
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileBuffer);

  // Extract CHART.DAT
  const chartFile = Object.keys(loadedZip.files).find(n => n.toUpperCase().includes('CHART.DAT'));
  if (!chartFile) {
    console.error('CHART.DAT not found');
    process.exit(1);
  }

  const chartData = Buffer.from(await loadedZip.files[chartFile].async('uint8array'));
  console.log(`📋 Loaded CHART.DAT (${chartData.length} bytes)`);

  // Extract records
  const records = extractAccountRecords(chartData);
  console.log(`📊 Found ${records.length} account records\n`);

  // Analyze with Gemini
  const balances = await analyzeWithGemini(records);

  // Display results
  console.log('💰 Extracted Balances:');
  console.log('─'.repeat(70));
  console.log(`${'Acct#'.padEnd(8)} ${'Name'.padEnd(35)} ${'Balance'.padStart(18)}`);
  console.log('─'.repeat(70));

  const sortedRecords = records.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

  for (const record of sortedRecords.slice(0, 40)) {
    const balance = balances.get(record.accountNumber) || 0;
    const balanceStr = balance.toLocaleString('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    console.log(
      `${record.accountNumber.padEnd(8)} ${record.accountName.slice(0, 35).padEnd(35)} ${balanceStr.padStart(18)}`
    );
  }

  if (records.length > 40) {
    console.log(`... and ${records.length - 40} more accounts`);
  }
  console.log('─'.repeat(70));

  // Apply to database
  if (shouldApply) {
    console.log('\n💾 Applying balances to database...');

    let updated = 0;
    let skipped = 0;

    for (const [accountNumber, balance] of balances) {
      if (balance !== 0) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update({ balance: balance.toString() })
          .eq('company_id', companyId)
          .eq('account_number', accountNumber);

        if (!error) {
          updated++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`✅ Updated ${updated} account balances`);
    if (skipped > 0) {
      console.log(`⚠️  ${skipped} accounts not found in database`);
    }
  } else {
    console.log('\n💡 Run with --apply to update database');
  }
}

main().catch(console.error);
