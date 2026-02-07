/**
 * Smart PTB Balance Extractor
 * Analyzes Peachtree backup files to extract account balances
 * Uses pattern recognition across multiple records to find consistent balance locations
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface AccountRecord {
  offset: number;
  accountNumber: string;
  accountName: string;
  binaryContext: Buffer;
  potentialBalances: { offset: number; value: number; type: string }[];
}

interface BalanceCandidate {
  accountNumber: string;
  accountName: string;
  balance: number;
  confidence: number;
}

// Try multiple numeric decodings at a given offset
function tryDecodeNumeric(buffer: Buffer, offset: number): { value: number; type: string }[] {
  const results: { value: number; type: string }[] = [];

  if (offset + 8 > buffer.length) return results;

  // Try int32 as cents (most common for currency)
  try {
    const val = buffer.readInt32LE(offset) / 100;
    if (Math.abs(val) > 0.01 && Math.abs(val) < 100000000) {
      results.push({ value: Math.round(val * 100) / 100, type: 'int32_cents' });
    }
  } catch {}

  // Try int64 as cents
  try {
    const val = Number(buffer.readBigInt64LE(offset)) / 100;
    if (Math.abs(val) > 0.01 && Math.abs(val) < 100000000) {
      results.push({ value: Math.round(val * 100) / 100, type: 'int64_cents' });
    }
  } catch {}

  // Try double
  try {
    const val = buffer.readDoubleLE(offset);
    if (Math.abs(val) > 0.01 && Math.abs(val) < 100000000 && Number.isFinite(val)) {
      // Check if it looks like currency (max 2 decimal places when rounded)
      const rounded = Math.round(val * 100) / 100;
      if (Math.abs(val - rounded) < 0.001) {
        results.push({ value: rounded, type: 'double' });
      }
    }
  } catch {}

  // Try int32 scaled by 10000 (4 decimal places)
  try {
    const val = buffer.readInt32LE(offset) / 10000;
    if (Math.abs(val) > 0.01 && Math.abs(val) < 10000000) {
      results.push({ value: Math.round(val * 100) / 100, type: 'int32_4dec' });
    }
  } catch {}

  return results;
}

// Extract account records from CHART.DAT
function extractAccountRecords(chartData: Buffer): AccountRecord[] {
  const records: AccountRecord[] = [];
  const seen = new Set<string>();

  let i = 0;
  while (i < chartData.length - 200) {
    // Look for 4-byte length prefix followed by 4-digit account number
    if (chartData[i] === 0x04 && chartData[i + 1] === 0x00) {
      const potentialNum = chartData.slice(i + 2, i + 6).toString('ascii');

      if (/^\d{4}$/.test(potentialNum)) {
        // Found account number, look for name
        for (let j = 8; j < 60; j++) {
          const nameLen = chartData[i + j];
          if (nameLen >= 5 && nameLen <= 50) {
            const nameStart = i + j + 4;
            if (nameStart + nameLen <= chartData.length) {
              const potentialName = chartData.slice(nameStart, nameStart + nameLen).toString('ascii');

              // Validate it looks like a real name
              if (/^[A-Za-z]/.test(potentialName) &&
                  potentialName.split('').filter(c => /[a-zA-Z]/.test(c)).length >= 3) {

                const key = `${potentialNum}-${potentialName.trim()}`;
                if (!seen.has(key)) {
                  seen.add(key);

                  // Extract binary context after name for balance analysis
                  const contextStart = nameStart + nameLen;
                  const contextEnd = Math.min(chartData.length, contextStart + 100);
                  const binaryContext = chartData.slice(contextStart, contextEnd);

                  // Try all offsets for potential balances
                  const potentialBalances: { offset: number; value: number; type: string }[] = [];
                  for (let off = 0; off < 40; off += 2) {
                    const decoded = tryDecodeNumeric(binaryContext, off);
                    for (const d of decoded) {
                      potentialBalances.push({ offset: off, ...d });
                    }
                  }

                  records.push({
                    offset: i,
                    accountNumber: potentialNum,
                    accountName: potentialName.trim(),
                    binaryContext,
                    potentialBalances
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

// Find the most consistent balance offset across all records
function findBestBalanceOffset(records: AccountRecord[]): { offset: number; type: string } | null {
  // Count how many records have a value at each offset/type combination
  const offsetCounts: Map<string, number> = new Map();

  for (const rec of records) {
    for (const bal of rec.potentialBalances) {
      const key = `${bal.offset}-${bal.type}`;
      offsetCounts.set(key, (offsetCounts.get(key) || 0) + 1);
    }
  }

  // Find the most common offset/type
  let bestKey = '';
  let bestCount = 0;

  for (const [key, count] of offsetCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }

  if (bestKey && bestCount >= records.length * 0.5) {
    const [offset, type] = bestKey.split('-');
    return { offset: parseInt(offset), type };
  }

  return null;
}

// Extract balances using the best consistent offset
function extractBalances(records: AccountRecord[], bestOffset: { offset: number; type: string } | null): BalanceCandidate[] {
  const results: BalanceCandidate[] = [];

  for (const rec of records) {
    let balance = 0;
    let confidence = 0;

    if (bestOffset) {
      // Try to find balance at the best offset
      const match = rec.potentialBalances.find(
        b => b.offset === bestOffset.offset && b.type === bestOffset.type
      );
      if (match) {
        balance = match.value;
        confidence = 0.8;
      }
    }

    // If no match at best offset, use heuristics
    if (confidence === 0 && rec.potentialBalances.length > 0) {
      // Prefer int32_cents at low offsets
      const candidates = rec.potentialBalances
        .filter(b => b.type === 'int32_cents' && b.offset < 20)
        .sort((a, b) => a.offset - b.offset);

      if (candidates.length > 0) {
        balance = candidates[0].value;
        confidence = 0.5;
      }
    }

    results.push({
      accountNumber: rec.accountNumber,
      accountName: rec.accountName,
      balance,
      confidence
    });
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/extract-ptb-balances.ts <company_id> <ptb_file>');
    console.log('       npx tsx scripts/extract-ptb-balances.ts <company_id> <ptb_file> --apply');
    process.exit(1);
  }

  const companyId = args[0];
  const ptbPath = args[1];
  const shouldApply = args.includes('--apply');

  console.log('\n🔍 Smart PTB Balance Extractor');
  console.log('================================\n');

  // Read PTB file
  const fileBuffer = fs.readFileSync(ptbPath);
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileBuffer);

  // Extract CHART.DAT
  const chartFile = Object.keys(loadedZip.files).find(n => n.toUpperCase().includes('CHART.DAT'));
  if (!chartFile) {
    console.error('CHART.DAT not found in PTB file');
    process.exit(1);
  }

  const chartData = Buffer.from(await loadedZip.files[chartFile].async('uint8array'));
  console.log(`📂 Loaded CHART.DAT (${chartData.length} bytes)`);

  // Extract records
  const records = extractAccountRecords(chartData);
  console.log(`📋 Found ${records.length} account records\n`);

  // Find best balance offset
  const bestOffset = findBestBalanceOffset(records);
  if (bestOffset) {
    console.log(`🎯 Best balance pattern: offset ${bestOffset.offset}, type ${bestOffset.type}\n`);
  } else {
    console.log('⚠️  No consistent balance pattern found, using heuristics\n');
  }

  // Extract balances
  const balances = extractBalances(records, bestOffset);

  // Display results
  console.log('📊 Extracted Balances:');
  console.log('─'.repeat(70));
  console.log(`${'Account'.padEnd(8)} ${'Name'.padEnd(35)} ${'Balance'.padStart(15)} ${'Conf'.padStart(6)}`);
  console.log('─'.repeat(70));

  for (const bal of balances.slice(0, 30)) {
    const confStr = bal.confidence > 0 ? `${(bal.confidence * 100).toFixed(0)}%` : '-';
    console.log(
      `${bal.accountNumber.padEnd(8)} ${bal.accountName.slice(0, 35).padEnd(35)} ${bal.balance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(15)} ${confStr.padStart(6)}`
    );
  }

  if (balances.length > 30) {
    console.log(`... and ${balances.length - 30} more accounts`);
  }

  console.log('─'.repeat(70));

  // Apply to database if requested
  if (shouldApply) {
    console.log('\n💾 Applying balances to database...');

    let updated = 0;
    let failed = 0;

    for (const bal of balances) {
      if (bal.balance !== 0) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update({ balance: bal.balance.toString() })
          .eq('company_id', companyId)
          .eq('account_number', bal.accountNumber);

        if (!error) {
          updated++;
        } else {
          failed++;
        }
      }
    }

    console.log(`✅ Updated ${updated} account balances`);
    if (failed > 0) {
      console.log(`⚠️  ${failed} updates failed (account number mismatch)`);
    }
  } else {
    console.log('\n💡 Run with --apply to update database balances');
  }
}

main().catch(console.error);
