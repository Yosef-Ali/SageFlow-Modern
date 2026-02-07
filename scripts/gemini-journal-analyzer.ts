/**
 * Gemini Journal Analyzer
 * Extracts transaction amounts from JRNLROW.DAT and calculates account balances
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

const geminiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!geminiKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('Missing API keys');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Try to find currency amounts in binary data
function findCurrencyAmounts(buffer: Buffer): { offset: number; value: number; type: string }[] {
  const amounts: { offset: number; value: number; type: string }[] = [];

  for (let i = 0; i < buffer.length - 8; i += 2) {
    // Try currency as double
    try {
      const d = buffer.readDoubleLE(i);
      if (Number.isFinite(d) && Math.abs(d) > 0.01 && Math.abs(d) < 10000000) {
        const rounded = Math.round(d * 100) / 100;
        if (Math.abs(d - rounded) < 0.005) {
          amounts.push({ offset: i, value: rounded, type: 'double' });
        }
      }
    } catch {}

    // Try as int32 cents
    try {
      const cents = buffer.readInt32LE(i);
      const val = cents / 100;
      if (Math.abs(val) > 0.01 && Math.abs(val) < 10000000) {
        amounts.push({ offset: i, value: Math.round(val * 100) / 100, type: 'int32' });
      }
    } catch {}
  }

  return amounts;
}

async function analyzeJournalStructure(jrnlData: Buffer): Promise<void> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Get samples from different parts of the file
  const samples: string[] = [];
  const offsets = [0x10000, 0x20000, 0x40000, 0x80000];

  for (const off of offsets) {
    if (off + 512 < jrnlData.length) {
      const sample = jrnlData.subarray(off, off + 256);
      const amounts = findCurrencyAmounts(sample);

      samples.push(`
Offset ${off.toString(16)}:
Hex: ${sample.subarray(0, 64).toString('hex')}
Potential amounts found: ${amounts.slice(0, 5).map(a => `${a.value} (${a.type}@${a.offset})`).join(', ')}
`);
    }
  }

  const prompt = `Analyze this journal entry data from a Peachtree accounting backup:

${samples.join('\n')}

Journal entries typically contain:
- Transaction ID or reference
- Account ID/number (links to chart of accounts)
- Debit amount OR Credit amount (usually one is zero)
- Date

Based on the hex patterns and potential amounts found, identify:
1. The most likely offset for the AMOUNT field
2. The data type (double, int32 as cents, etc.)
3. Any patterns you see in the structure

Respond with JSON:
{
  "amountOffset": <number>,
  "amountType": "double" or "int32",
  "recordSize": <estimated bytes per record>,
  "patterns": ["description of patterns found"],
  "confidence": "high" or "medium" or "low"
}`;

  console.log('🤖 Asking Gemini to analyze journal structure...\n');

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  console.log('Gemini Analysis:');
  console.log(response);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: npx tsx scripts/gemini-journal-analyzer.ts <ptb_file>');
    process.exit(1);
  }

  const ptbPath = args[0];

  console.log('\n📊 Gemini Journal Analyzer');
  console.log('===========================\n');

  const fileBuffer = fs.readFileSync(ptbPath);
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileBuffer);

  // Find JRNLROW.DAT
  const jrnlFile = Object.keys(loadedZip.files).find(n => n.toUpperCase().includes('JRNLROW'));
  if (!jrnlFile) {
    console.error('JRNLROW.DAT not found');
    process.exit(1);
  }

  const jrnlData = Buffer.from(await loadedZip.files[jrnlFile].async('uint8array'));
  console.log(`📂 Loaded ${jrnlFile} (${(jrnlData.length / 1024 / 1024).toFixed(1)} MB)`);

  // Read record count from FCR
  const recordCount = jrnlData.readUInt32LE(0x1C);
  console.log(`📋 Record count: ${recordCount}\n`);

  await analyzeJournalStructure(jrnlData);
}

main().catch(console.error);
