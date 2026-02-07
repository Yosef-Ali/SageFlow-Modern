/**
 * Test PTB Service V3
 * Run with: node test-ptb-v3.js
 */

const { PTBServiceV3 } = require('./electron/ptb-service-v3');
const fs = require('fs');
const path = require('path');

async function testImport() {
  const ptbService = new PTBServiceV3();
  ptbService.debugMode = true;

  const ptbFile = path.join(__dirname, 'SWK 2018-011026.ptb');
  
  if (!fs.existsSync(ptbFile)) {
    console.error('PTB file not found:', ptbFile);
    return;
  }

  console.log('\n========== TESTING PTB IMPORT V3 ==========\n');
  
  const result = await ptbService.importPTB(ptbFile);
  
  if (result.success) {
    console.log('\n✅ Import successful!\n');
    
    // Show statistics
    console.log('📊 Statistics:');
    console.log(`   Total Accounts: ${result.stats.totalAccounts}`);
    console.log(`   Accounts with Balances: ${result.stats.accountsWithBalances}`);
    console.log(`   Total Customers: ${result.stats.totalCustomers}`);
    console.log(`   Total Vendors: ${result.stats.totalVendors}`);
    
    console.log('\n💰 Balance Summary:');
    console.log(`   Assets:      ${result.stats.balanceSummary.assets.toLocaleString()}`);
    console.log(`   Liabilities: ${result.stats.balanceSummary.liabilities.toLocaleString()}`);
    console.log(`   Equity:      ${result.stats.balanceSummary.equity.toLocaleString()}`);
    console.log(`   Revenue:     ${result.stats.balanceSummary.revenue.toLocaleString()}`);
    console.log(`   Expenses:    ${result.stats.balanceSummary.expenses.toLocaleString()}`);
    
    // Show first 20 accounts with balances
    const accountsWithBalance = result.data.chart_of_accounts.filter(a => a.balance !== 0);
    
    if (accountsWithBalance.length > 0) {
      console.log('\n📋 Sample Accounts with Balances (first 20):');
      console.log('─'.repeat(70));
      
      accountsWithBalance.slice(0, 20).forEach(acct => {
        const balance = acct.balance.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        });
        console.log(`   ${acct.account_number.padEnd(10)} ${acct.account_name.substring(0, 35).padEnd(35)} ${balance.padStart(15)}`);
      });
      
      console.log('─'.repeat(70));
    }
    
    // Save full results
    const outputPath = path.join(__dirname, 'ptb-output', 'v3_extraction.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📁 Full results saved to: ${outputPath}`);
    
  } else {
    console.error('\n❌ Import failed:', result.error);
  }
}

async function testExport() {
  const ptbService = new PTBServiceV3();
  
  // Sample data for export test
  const sampleData = {
    company_info: {
      name: 'SageFlow Test Company',
      address: '123 Test Street',
      city: 'Addis Ababa, Ethiopia'
    },
    chart_of_accounts: [
      { account_number: '1000', account_name: 'Cash in Bank', type: 'ASSET', balance: 50000 },
      { account_number: '1100', account_name: 'Accounts Receivable', type: 'ASSET', balance: 25000 },
      { account_number: '2000', account_name: 'Accounts Payable', type: 'LIABILITY', balance: 15000 },
      { account_number: '3000', account_name: 'Owner Equity', type: 'EQUITY', balance: 60000 },
      { account_number: '4000', account_name: 'Sales Revenue', type: 'REVENUE', balance: 100000 },
      { account_number: '5000', account_name: 'Cost of Goods Sold', type: 'EXPENSE', balance: 40000 }
    ],
    customers: [
      { customer_id: 'CUST-001', name: 'ABC Company', balance: 5000 },
      { customer_id: 'CUST-002', name: 'XYZ Corporation', balance: 3000 }
    ],
    vendors: [
      { vendor_id: 'VEND-001', name: 'Supply Co.', balance: 2000 },
      { vendor_id: 'VEND-002', name: 'Materials Inc.', balance: 1500 }
    ]
  };
  
  const outputPath = path.join(__dirname, 'ptb-output', 'SageFlow_Export_Test.ptb');
  
  console.log('\n========== TESTING PTB EXPORT V3 ==========\n');
  
  const result = await ptbService.exportPTB(sampleData, outputPath);
  
  if (result.success) {
    console.log('✅ Export successful!');
    console.log(`   File: ${result.path}`);
    console.log(`   Accounts: ${result.stats.accounts}`);
    console.log(`   Customers: ${result.stats.customers}`);
    console.log(`   Vendors: ${result.stats.vendors}`);
    
    // Verify by re-importing
    console.log('\n🔄 Verifying export by re-importing...');
    const verifyResult = await ptbService.importPTB(outputPath);
    
    if (verifyResult.success) {
      console.log('✅ Verification successful!');
      console.log(`   Accounts recovered: ${verifyResult.stats.totalAccounts}`);
    }
  } else {
    console.error('❌ Export failed:', result.error);
  }
}

async function main() {
  try {
    await testImport();
    console.log('\n');
    await testExport();
    console.log('\n========== TESTS COMPLETE ==========\n');
  } catch (error) {
    console.error('Test error:', error);
  }
}

main();
