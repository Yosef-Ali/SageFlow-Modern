/**
 * Test the Enhanced PTB Service
 * Run: node test-ptb-enhanced.js
 */

const path = require('path');
const { EnhancedPTBService } = require('./electron/ptb-service-enhanced');

async function main() {
  console.log('\n🔬 Enhanced PTB Service Test\n');
  console.log('='.repeat(60));

  const ptbPath = path.join(__dirname, 'SWK 2018-011026.ptb');
  
  const service = new EnhancedPTBService();
  service.setDebugMode(true); // Enable debug logging
  
  console.log(`\n📂 Testing with: ${ptbPath}\n`);
  
  const result = await service.importPTB(ptbPath);
  
  if (!result.success) {
    console.error('❌ Import failed:', result.error);
    return;
  }
  
  console.log('\n✅ Import Successful!\n');
  console.log('='.repeat(60));
  
  // Show statistics
  console.log('\n📊 Statistics:');
  console.log(`  Total Accounts: ${result.stats.totalAccounts}`);
  console.log(`  Accounts with Balances: ${result.stats.accountsWithBalances}`);
  console.log(`  Total Customers: ${result.stats.totalCustomers}`);
  console.log(`  Total Vendors: ${result.stats.totalVendors}`);
  
  console.log('\n💰 Balance Summary:');
  console.log(`  Assets:      ${result.stats.balanceSummary.assets.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`);
  console.log(`  Liabilities: ${result.stats.balanceSummary.liabilities.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`);
  console.log(`  Equity:      ${result.stats.balanceSummary.equity.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`);
  console.log(`  Revenue:     ${result.stats.balanceSummary.revenue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`);
  console.log(`  Expenses:    ${result.stats.balanceSummary.expenses.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}`);
  
  // Show sample accounts with balances
  const accountsWithBalances = result.data.chart_of_accounts
    .filter(a => a.balance !== 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 20);
  
  console.log('\n📋 Top 20 Accounts with Balances:');
  console.log('-'.repeat(70));
  console.log(`${'Acct#'.padEnd(10)} ${'Name'.padEnd(35)} ${'Type'.padEnd(12)} ${'Balance'.padStart(12)}`);
  console.log('-'.repeat(70));
  
  for (const acct of accountsWithBalances) {
    console.log(
      `${acct.account_number.padEnd(10)} ` +
      `${acct.account_name.slice(0, 35).padEnd(35)} ` +
      `${acct.type.padEnd(12)} ` +
      `${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)}`
    );
  }
  
  console.log('-'.repeat(70));
  
  // Test export
  console.log('\n📦 Testing Export...');
  
  const exportPath = path.join(__dirname, 'ptb-output', 'SageFlow_Enhanced_Export.ptb');
  const exportResult = await service.exportPTB(result.data, exportPath);
  
  if (exportResult.success) {
    console.log(`✅ Export successful: ${exportPath}`);
  } else {
    console.error('❌ Export failed:', exportResult.error);
  }
  
  // Re-import the exported file to verify round-trip
  console.log('\n🔄 Verifying Round-Trip...');
  const reimportResult = await service.importPTB(exportPath);
  
  if (reimportResult.success) {
    console.log(`✅ Re-import successful!`);
    console.log(`   Original accounts: ${result.data.chart_of_accounts.length}`);
    console.log(`   Re-imported accounts: ${reimportResult.data.chart_of_accounts.length}`);
  } else {
    console.error('❌ Re-import failed:', reimportResult.error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test Complete!\n');
}

main().catch(console.error);
