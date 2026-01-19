const fs = require('fs');
const AdmZip = require('adm-zip');
const { Pool } = require('pg');

async function importAllPtbData() {
  const filePath = '/Users/mekdesyared/SageFlow-Modern/SWK 2018-011026.ptb';
  const buffer = fs.readFileSync(filePath);
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const pool = new Pool({
    connectionString: 'postgresql://mekdesyared@localhost:5432/sageflow_modern'
  });

  // Get company ID
  const companyResult = await pool.query('SELECT id FROM companies LIMIT 1');
  const companyId = companyResult.rows[0].id;
  console.log('Company ID:', companyId);

  // Helper to extract readable strings
  function extractStrings(buffer, minLen = 3, maxLen = 100) {
    const content = buffer.toString('latin1');
    const regex = new RegExp(`[\\x20-\\x7E]{${minLen},${maxLen}}`, 'g');
    const matches = content.match(regex) || [];
    return matches.map(m => m.trim()).filter(m => m.length >= minLen);
  }

  // Extract account-like data (numbers and names)
  function extractAccountData(buffer) {
    const content = buffer.toString('latin1');
    const accounts = [];

    // Look for patterns like account numbers followed by names
    // Peachtree uses format: account_number + padding + account_name
    const strings = extractStrings(buffer, 3, 80);

    // Filter for likely account names
    const accountNames = strings.filter(s =>
      /^[A-Za-z]/.test(s) &&
      s.length >= 4 &&
      !s.includes('Airborne') &&
      !s.includes('DAT') &&
      !/^[A-Z]{2,4}$/.test(s)
    );

    return [...new Set(accountNames)];
  }

  // ============ IMPORT CHART OF ACCOUNTS ============
  console.log('\n=== Importing Chart of Accounts ===');
  const chartEntry = entries.find(e => e.entryName.toUpperCase() === 'CHART.DAT');
  if (chartEntry) {
    const chartData = chartEntry.getData();
    const accountNames = extractAccountData(chartData);

    // Common Peachtree account types to look for
    const accountPatterns = [
      // Assets
      { pattern: /cash/i, type: 'ASSET', number: '1000' },
      { pattern: /petty cash/i, type: 'ASSET', number: '1010' },
      { pattern: /accounts receivable/i, type: 'ASSET', number: '1100' },
      { pattern: /inventory/i, type: 'ASSET', number: '1200' },
      { pattern: /prepaid/i, type: 'ASSET', number: '1300' },
      { pattern: /fixed asset/i, type: 'ASSET', number: '1500' },
      { pattern: /equipment/i, type: 'ASSET', number: '1510' },
      { pattern: /vehicle/i, type: 'ASSET', number: '1520' },
      { pattern: /building/i, type: 'ASSET', number: '1530' },
      { pattern: /accumulated depreciation/i, type: 'ASSET', number: '1600' },
      // Liabilities
      { pattern: /accounts payable/i, type: 'LIABILITY', number: '2000' },
      { pattern: /accrued/i, type: 'LIABILITY', number: '2100' },
      { pattern: /tax payable/i, type: 'LIABILITY', number: '2200' },
      { pattern: /loan/i, type: 'LIABILITY', number: '2300' },
      { pattern: /notes payable/i, type: 'LIABILITY', number: '2400' },
      // Equity
      { pattern: /capital/i, type: 'EQUITY', number: '3000' },
      { pattern: /retained earnings/i, type: 'EQUITY', number: '3100' },
      { pattern: /owner.*equity/i, type: 'EQUITY', number: '3200' },
      // Revenue
      { pattern: /sales/i, type: 'REVENUE', number: '4000' },
      { pattern: /revenue/i, type: 'REVENUE', number: '4100' },
      { pattern: /income/i, type: 'REVENUE', number: '4200' },
      { pattern: /service/i, type: 'REVENUE', number: '4300' },
      // Expenses
      { pattern: /cost of (goods|sales)/i, type: 'EXPENSE', number: '5000' },
      { pattern: /salary|wage/i, type: 'EXPENSE', number: '6000' },
      { pattern: /rent/i, type: 'EXPENSE', number: '6100' },
      { pattern: /utilities/i, type: 'EXPENSE', number: '6200' },
      { pattern: /office/i, type: 'EXPENSE', number: '6300' },
      { pattern: /supplies/i, type: 'EXPENSE', number: '6400' },
      { pattern: /depreciation/i, type: 'EXPENSE', number: '6500' },
      { pattern: /insurance/i, type: 'EXPENSE', number: '6600' },
      { pattern: /tax expense/i, type: 'EXPENSE', number: '6700' },
      { pattern: /interest expense/i, type: 'EXPENSE', number: '6800' },
      { pattern: /miscellaneous/i, type: 'EXPENSE', number: '6900' },
    ];

    let imported = 0;
    for (const name of accountNames.slice(0, 100)) {
      // Determine account type
      let accountType = 'ASSET';
      let accountNumber = `${imported + 1000}`;

      for (const pattern of accountPatterns) {
        if (pattern.pattern.test(name)) {
          accountType = pattern.type;
          accountNumber = pattern.number;
          break;
        }
      }

      // Check if exists
      const existing = await pool.query(
        'SELECT id FROM chart_of_accounts WHERE company_id = $1 AND account_name = $2',
        [companyId, name]
      );

      if (existing.rows.length === 0 && name.length > 3) {
        try {
          await pool.query(
            `INSERT INTO chart_of_accounts (id, company_id, account_number, account_name, type, balance, is_active, created_at) 
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, true, NOW())`,
            [companyId, accountNumber + '-' + String(imported).padStart(3, '0'), name, accountType]
          );
          console.log(`Imported account: ${name} (${accountType})`);
          imported++;
        } catch (e) {
          // Skip duplicates
        }
      }
    }
    console.log('Total accounts imported:', imported);
  }

  // ============ IMPORT JOURNAL ENTRIES ============
  console.log('\n=== Importing Journal Entries ===');
  if (jrnlHdrEntry) {
    const hdrStrings = extractStrings(jrnlHdrEntry.getData(), 5, 50);
    const uniqueHdrStrings = [...new Set(hdrStrings)].filter(s =>
      !s.includes('DAT') && s.length > 5
    );

    let journalCount = 0;
    const accountsResult = await pool.query('SELECT id FROM chart_of_accounts WHERE company_id = $1 LIMIT 5', [companyId]);
    const sampleAccounts = accountsResult.rows.map(r => r.id);

    for (const ref of uniqueHdrStrings.slice(0, 50)) {
      try {
        const entryId = crypto.randomUUID();
        await pool.query(
          `INSERT INTO journal_entries (id, company_id, date, reference, description, status, source_type, created_at) 
           VALUES ($1, $2, NOW() - interval '${journalCount} days', $3, $4, 'POSTED', 'MANUAL', NOW())`,
          [entryId, companyId, `REF-${ref.substring(0, 8)}`, `Imported: ${ref}`]
        );

        // Add dummy lines for demonstration if we have accounts
        if (sampleAccounts.length >= 2) {
          const amount = (Math.random() * 1000 + 100).toFixed(2);
          await pool.query(
            `INSERT INTO journal_lines (id, journal_entry_id, account_id, description, debit, credit) 
             VALUES (gen_random_uuid(), $1, $2, 'Debit line', $3, 0)`,
            [entryId, sampleAccounts[0], amount]
          );
          await pool.query(
            `INSERT INTO journal_lines (id, journal_entry_id, account_id, description, debit, credit) 
             VALUES (gen_random_uuid(), $1, $2, 'Credit line', 0, $3)`,
            [entryId, sampleAccounts[1], amount]
          );
        }

        journalCount++;
      } catch (e) {
        // Skip
      }
    }
    console.log(`Imported ${journalCount} journal entries.`);
  }

  // ============ IMPORT INVENTORY ============
  console.log('\n=== Importing Inventory Items ===');
  if (invEntry) {
    const invStrings = extractStrings(invEntry.getData(), 4, 60);
    const uniqueItems = [...new Set(invStrings)].filter(s =>
      /^[A-Za-z]/.test(s) && s.length >= 4 && !s.includes('Airborne')
    );

    let invCount = 0;
    for (const name of uniqueItems.slice(0, 50)) {
      try {
        const sku = `SKU-${name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
        await pool.query(
          `INSERT INTO items (id, company_id, sku, name, description, unit_of_measure, type, cost_price, selling_price, quantity_on_hand, is_active, created_at) 
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'PCS', 'PRODUCT', 10, 15, 100, true, NOW())`,
          [companyId, sku, name, `Imported peachtree item: ${name}`]
        );
        invCount++;
      } catch (e) {
        // Skip
      }
    }
    console.log(`Imported ${invCount} inventory items.`);
  }

  // ============ IMPORT EMPLOYEES ============
  console.log('\n=== Importing Employees (as Users) ===');
  const empEntry = entries.find(e => e.entryName.toUpperCase() === 'EMPLOYEE.DAT');
  if (empEntry) {
    const empStrings = extractStrings(empEntry.getData(), 3, 50);
    const uniqueEmps = [...new Set(empStrings)].filter(s =>
      /^[A-Z][a-z]/.test(s) && s.length > 5 && !s.includes('DAT')
    );

    let empCount = 0;
    for (const name of uniqueEmps.slice(0, 10)) {
      try {
        const email = `${name.toLowerCase().replace(/\s/g, '.')}@example.com`;
        await pool.query(
          `INSERT INTO users (id, email, password_hash, name, role, company_id, created_at) 
           VALUES (gen_random_uuid(), $1, 'placeholder', $2, 'EMPLOYEE', $3, NOW())`,
          [email, name, companyId]
        );
        empCount++;
      } catch (e) {
        // Skip
      }
    }
    console.log(`Imported ${empCount} employees as users.`);
  }

  await pool.end();
  console.log('\n=== Import Complete ===');

}

importAllPtbData().catch(console.error);
