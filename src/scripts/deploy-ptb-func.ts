import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv'; // Load .env

// Load .env.local
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL or DIRECT_URL is required in .env.local');
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, '../db/sql/import_ptb.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log('Deploying SQL function from:', sqlPath);

  const sql = postgres(connectionString);

  try {
    await sql.unsafe(sqlContent);
    console.log('✅ Function import_ptb_v1 deployed successfully!');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  } finally {
    await sql.end();
  }
}

main();
