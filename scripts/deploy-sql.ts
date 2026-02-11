
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const sql = postgres(connectionString);

async function deploy() {
  const filePath = path.resolve(__dirname, '../src/db/sql/import_ptb_v2.sql');
  console.log(`Reading SQL from ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.error('File not found');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  console.log('Executing SQL...');
  try {
    // postgres.js unsafe allows raw query
    await sql.unsafe(sqlContent);
    console.log('✅ Successfully deployed import_ptb_v2 function!');
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await sql.end();
  }
}

deploy();
