#!/usr/bin/env tsx

/**
 * Peachtree Migration CLI
 * 
 * Usage:
 *   npm run migrate:peachtree
 * 
 * This script migrates data from Peachtree ODBC to SageFlow Modern
 */

import { runPeachtreeMigration } from '../lib/peachtree/migration';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('');
  console.log('🔄 Peachtree to SageFlow Modern Migration');
  console.log('==========================================');
  console.log('');

  console.log('Prerequisites:');
  console.log('1. ✅ Peachtree ODBC driver installed');
  console.log('2. ✅ ODBC Data Source Name (DSN) configured');
  console.log('3. ✅ Environment variables set in .env.local:');
  console.log('   - PEACHTREE_DSN');
  console.log('   - PEACHTREE_USERNAME (optional)');
  console.log('   - PEACHTREE_PASSWORD (optional)');
  console.log('');

  const proceed = await question('Ready to proceed? (yes/no): ');
  
  if (proceed.toLowerCase() !== 'yes') {
    console.log('❌ Migration cancelled');
    rl.close();
    return;
  }

  console.log('');
  
  // Get company ID (for multi-tenancy)
  const companyId = await question('Enter Company ID (or "default" for first company): ');
  const finalCompanyId = companyId.trim() || 'default';

  console.log('');
  console.log(`🚀 Starting migration for company: ${finalCompanyId}`);
  console.log('');

  try {
    await runPeachtreeMigration(finalCompanyId);
    
    console.log('');
    console.log('✅ ==========================================');
    console.log('✅ Migration completed successfully!');
    console.log('✅ ==========================================');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review migrated data in Drizzle Studio: npm run db:studio');
    console.log('2. Check for any warnings or errors above');
    console.log('3. Verify data integrity');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ ==========================================');
    console.error('❌ Migration failed!');
    console.error('❌ ==========================================');
    console.error('');
    console.error('Error:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check ODBC connection settings');
    console.error('2. Verify Peachtree database is accessible');
    console.error('3. Check environment variables in .env.local');
    console.error('4. Review error message above');
    console.error('');
    process.exit(1);
  }

  rl.close();
}

main();
