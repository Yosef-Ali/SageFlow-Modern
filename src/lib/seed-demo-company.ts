/**
 * Demo Seed: Ethiopian Construction Machinery Rental Company
 * ኢትዮጵያ የግንባታ ማሽነሪ ኪራይ ኩባንያ
 *
 * Full operational data for demonstration purposes
 */

import { supabase } from './supabase'

// Helper to generate UUID-like IDs
const generateId = () => crypto.randomUUID()

export async function seedDemoConstructionCompany() {
  console.log('🏗️ Starting demo seed: Ethiopian Construction Machinery Rental Company...')

  try {
    // ============================================
    // 1. COMPANY
    // ============================================
    const companyId = generateId()
    const company = {
      id: companyId,
      name: 'Abyssinia Heavy Equipment Rental',
      name_amharic: 'አቢሲኒያ ከባድ መሳሪያ ኪራይ',
      email: 'info@abyssinia-equipment.com.et',
      phone: '+251-11-551-2345',
      address: {
        street: 'Bole Road, Africa Avenue',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        postal_code: '1000',
        country: 'Ethiopia'
      },
      tin_number: 'TIN-0012345678',
      vat_number: 'VAT-0012345678',
      currency: 'ETB',
      fiscal_year_start: '2024-07-08', // Ethiopian New Year (Meskerem 1)
      industry: 'Construction Equipment Rental',
      founded_year: 2018,
      employee_count: 45,
      is_active: true
    }

    const { error: companyError } = await supabase.from('companies').upsert(company)
    if (companyError) throw companyError
    console.log('✅ Company created:', company.name)

    // ============================================
    // 2. DEMO USER
    // ============================================
    const demoUser = {
      id: generateId(),
      email: 'demo@sageflow.app',
      name: 'Dawit Bekele',
      password_hash: 'demo-managed',
      role: 'ADMIN',
      company_id: companyId
    }

    await supabase.from('users').upsert(demoUser, { onConflict: 'email' })
    console.log('✅ Demo user created:', demoUser.email)

    // ============================================
    // 3. CHART OF ACCOUNTS (Ethiopian Standard)
    // ============================================
    const accounts = [
      // Assets (1xxx) - ንብረት
      { account_number: '1000', account_name: 'Cash on Hand', account_name_am: 'በእጅ ያለ ጥሬ ገንዘብ', type: 'ASSET', sub_type: 'CURRENT_ASSET', balance: 125000 },
      { account_number: '1010', account_name: 'Commercial Bank of Ethiopia', account_name_am: 'የኢትዮጵያ ንግድ ባንክ', type: 'ASSET', sub_type: 'CURRENT_ASSET', balance: 2450000 },
      { account_number: '1020', account_name: 'Awash Bank', account_name_am: 'አዋሽ ባንክ', type: 'ASSET', sub_type: 'CURRENT_ASSET', balance: 1875000 },
      { account_number: '1100', account_name: 'Accounts Receivable', account_name_am: 'የሚሰበሰብ ሂሳብ', type: 'ASSET', sub_type: 'CURRENT_ASSET', balance: 3250000 },
      { account_number: '1150', account_name: 'Prepaid Insurance', account_name_am: 'ቅድመ ክፍያ ኢንሹራንስ', type: 'ASSET', sub_type: 'CURRENT_ASSET', balance: 180000 },
      { account_number: '1200', account_name: 'Fuel Inventory', account_name_am: 'የነዳጅ ክምችት', type: 'ASSET', sub_type: 'CURRENT_ASSET', balance: 450000 },
      { account_number: '1210', account_name: 'Spare Parts Inventory', account_name_am: 'የመለዋወጫ ክምችት', type: 'ASSET', sub_type: 'CURRENT_ASSET', balance: 890000 },
      { account_number: '1500', account_name: 'Heavy Equipment - Cost', account_name_am: 'ከባድ መሳሪያዎች - ዋጋ', type: 'ASSET', sub_type: 'FIXED_ASSET', balance: 45000000 },
      { account_number: '1510', account_name: 'Accumulated Depreciation - Equipment', account_name_am: 'የተከማቸ ዋጋ ቅናሽ', type: 'ASSET', sub_type: 'FIXED_ASSET', balance: -12500000 },
      { account_number: '1600', account_name: 'Vehicles', account_name_am: 'ተሽከርካሪዎች', type: 'ASSET', sub_type: 'FIXED_ASSET', balance: 8500000 },
      { account_number: '1700', account_name: 'Office Equipment', account_name_am: 'የቢሮ መሳሪያዎች', type: 'ASSET', sub_type: 'FIXED_ASSET', balance: 350000 },

      // Liabilities (2xxx) - እዳ
      { account_number: '2000', account_name: 'Accounts Payable', account_name_am: 'የሚከፈል ሂሳብ', type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', balance: 1250000 },
      { account_number: '2100', account_name: 'VAT Payable (15%)', account_name_am: 'የሚከፈል ተ.እ.ታ', type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', balance: 485000 },
      { account_number: '2110', account_name: 'Withholding Tax Payable (2%)', account_name_am: 'የሚከፈል የግብር ቅነሳ', type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', balance: 95000 },
      { account_number: '2200', account_name: 'Salaries Payable', account_name_am: 'የሚከፈል ደመወዝ', type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', balance: 680000 },
      { account_number: '2300', account_name: 'Pension Contribution Payable', account_name_am: 'የጡረታ መዋጮ', type: 'LIABILITY', sub_type: 'CURRENT_LIABILITY', balance: 125000 },
      { account_number: '2500', account_name: 'Bank Loan - CBE', account_name_am: 'የባንክ ብድር', type: 'LIABILITY', sub_type: 'LONG_TERM_LIABILITY', balance: 15000000 },

      // Equity (3xxx) - ካፒታል
      { account_number: '3000', account_name: 'Owners Capital', account_name_am: 'የባለቤት ካፒታል', type: 'EQUITY', sub_type: 'EQUITY', balance: 25000000 },
      { account_number: '3100', account_name: 'Retained Earnings', account_name_am: 'የተያዘ ትርፍ', type: 'EQUITY', sub_type: 'EQUITY', balance: 8500000 },
      { account_number: '3200', account_name: 'Current Year Earnings', account_name_am: 'የዘንድሮ ትርፍ', type: 'EQUITY', sub_type: 'EQUITY', balance: 0 },

      // Revenue (4xxx) - ገቢ
      { account_number: '4000', account_name: 'Equipment Rental Income', account_name_am: 'የመሳሪያ ኪራይ ገቢ', type: 'REVENUE', sub_type: 'OPERATING_REVENUE', balance: 0 },
      { account_number: '4010', account_name: 'Excavator Rental', account_name_am: 'የአፈር ቆፋሪ ኪራይ', type: 'REVENUE', sub_type: 'OPERATING_REVENUE', balance: 0 },
      { account_number: '4020', account_name: 'Loader Rental', account_name_am: 'የጭነት መኪና ኪራይ', type: 'REVENUE', sub_type: 'OPERATING_REVENUE', balance: 0 },
      { account_number: '4030', account_name: 'Crane Rental', account_name_am: 'የመጫኛ ክሬን ኪራይ', type: 'REVENUE', sub_type: 'OPERATING_REVENUE', balance: 0 },
      { account_number: '4040', account_name: 'Bulldozer Rental', account_name_am: 'የቡልዶዘር ኪራይ', type: 'REVENUE', sub_type: 'OPERATING_REVENUE', balance: 0 },
      { account_number: '4100', account_name: 'Operator Services', account_name_am: 'የኦፕሬተር አገልግሎት', type: 'REVENUE', sub_type: 'OPERATING_REVENUE', balance: 0 },
      { account_number: '4200', account_name: 'Transportation Fees', account_name_am: 'የትራንስፖርት ክፍያ', type: 'REVENUE', sub_type: 'OPERATING_REVENUE', balance: 0 },
      { account_number: '4900', account_name: 'Other Income', account_name_am: 'ሌላ ገቢ', type: 'REVENUE', sub_type: 'OTHER_REVENUE', balance: 0 },

      // Expenses (5xxx-6xxx) - ወጪ
      { account_number: '5000', account_name: 'Fuel Expense', account_name_am: 'የነዳጅ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '5100', account_name: 'Maintenance & Repairs', account_name_am: 'ጥገና እና እድሳት', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '5200', account_name: 'Spare Parts Expense', account_name_am: 'የመለዋወጫ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '5300', account_name: 'Insurance Expense', account_name_am: 'የኢንሹራንስ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '5400', account_name: 'Depreciation Expense', account_name_am: 'የዋጋ ቅናሽ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6000', account_name: 'Salaries & Wages', account_name_am: 'ደመወዝ እና አበል', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6100', account_name: 'Operator Wages', account_name_am: 'የኦፕሬተር ደመወዝ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6200', account_name: 'Employee Benefits', account_name_am: 'የሰራተኛ ጥቅማጥቅም', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6300', account_name: 'Pension Expense (7%)', account_name_am: 'የጡረታ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6500', account_name: 'Office Rent', account_name_am: 'የቢሮ ኪራይ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6600', account_name: 'Utilities', account_name_am: 'የመገልገያ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6700', account_name: 'Transportation Expense', account_name_am: 'የትራንስፖርት ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6800', account_name: 'Bank Charges', account_name_am: 'የባንክ ክፍያ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '6900', account_name: 'Interest Expense', account_name_am: 'የወለድ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
      { account_number: '7000', account_name: 'Miscellaneous Expense', account_name_am: 'ልዩ ልዩ ወጪ', type: 'EXPENSE', sub_type: 'OPERATING_EXPENSE', balance: 0 },
    ]

    const chartOfAccounts = accounts.map(acc => ({
      id: generateId(),
      company_id: companyId,
      ...acc,
      is_active: true
    }))

    const { error: coaError } = await supabase.from('chart_of_accounts').insert(chartOfAccounts)
    if (coaError) throw coaError
    console.log('✅ Chart of Accounts created:', chartOfAccounts.length, 'accounts')

    // ============================================
    // 4. CUSTOMERS (Construction Companies)
    // ============================================
    const customers = [
      {
        customer_number: 'CUST-001',
        name: 'MIDROC Construction PLC',
        name_amharic: 'ሚድሮክ ኮንስትራክሽን',
        email: 'procurement@midroc.com.et',
        phone: '+251-11-661-5000',
        tin_number: 'TIN-0034567890',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 5000000,
        billing_address: { street: 'Bole Sub City, Woreda 03', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-002',
        name: 'Sur Construction Share Company',
        name_amharic: 'ሱር ኮንስትራክሽን',
        email: 'info@surconstruction.com.et',
        phone: '+251-11-552-3456',
        tin_number: 'TIN-0045678901',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 3500000,
        billing_address: { street: 'Kirkos Sub City', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-003',
        name: 'Ethiopian Roads Authority',
        name_amharic: 'የኢትዮጵያ መንገዶች ባለስልጣን',
        email: 'era@ethionet.et',
        phone: '+251-11-551-6000',
        tin_number: 'TIN-0001234567',
        customer_type: 'GOVERNMENT',
        payment_terms: 'NET_45',
        credit_limit: 10000000,
        billing_address: { street: 'Ras Abebe Aregay Street', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-004',
        name: 'CGC Overseas Construction Group',
        name_amharic: 'ሲጂሲ ኦቨርሲዝ',
        email: 'ethiopia@cgcoc.com.cn',
        phone: '+251-11-662-8900',
        tin_number: 'TIN-0056789012',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_15',
        credit_limit: 8000000,
        billing_address: { street: 'CMC Road', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-005',
        name: 'Yotek Construction',
        name_amharic: 'ዮቴክ ኮንስትራክሽን',
        email: 'yotek@ethionet.et',
        phone: '+251-11-553-2100',
        tin_number: 'TIN-0067890123',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 2500000,
        billing_address: { street: 'Megenagna', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-006',
        name: 'Ovid Construction PLC',
        name_amharic: 'ኦቪድ ኮንስትራክሽን',
        email: 'info@ovidconstruction.com',
        phone: '+251-11-554-7800',
        tin_number: 'TIN-0078901234',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 4000000,
        billing_address: { street: 'Gerji', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-007',
        name: 'Sunshine Construction',
        name_amharic: 'ሳንሻይን ኮንስትራክሽን',
        email: 'sunshine@gmail.com',
        phone: '+251-91-123-4567',
        tin_number: 'TIN-0089012345',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_15',
        credit_limit: 1500000,
        billing_address: { street: 'Aware', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-008',
        name: 'Metals & Engineering Corporation (METEC)',
        name_amharic: 'ሜቴክ',
        email: 'metec@ethionet.et',
        phone: '+251-11-646-5000',
        tin_number: 'TIN-0002345678',
        customer_type: 'GOVERNMENT',
        payment_terms: 'NET_60',
        credit_limit: 15000000,
        billing_address: { street: 'Akaki Kality', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-009',
        name: 'Ato Mulugeta Tadesse',
        name_amharic: 'አቶ ሙሉጌታ ታደሰ',
        email: 'mulugeta.tadesse@gmail.com',
        phone: '+251-91-234-5678',
        tin_number: 'TIN-0090123456',
        customer_type: 'INDIVIDUAL',
        payment_terms: 'CASH',
        credit_limit: 500000,
        billing_address: { street: 'Sarbet', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-010',
        name: 'Addis Ababa City Roads Authority',
        name_amharic: 'የአዲስ አበባ ከተማ መንገዶች ባለስልጣን',
        email: 'aacra@addisababa.gov.et',
        phone: '+251-11-551-1234',
        tin_number: 'TIN-0003456789',
        customer_type: 'GOVERNMENT',
        payment_terms: 'NET_45',
        credit_limit: 8000000,
        billing_address: { street: 'Mexico Square', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
    ]

    const customerRecords = customers.map(c => ({
      id: generateId(),
      company_id: companyId,
      ...c,
      is_active: true,
      balance: Math.floor(Math.random() * 500000) // Random outstanding balance
    }))

    const { error: custError } = await supabase.from('customers').insert(customerRecords)
    if (custError) throw custError
    console.log('✅ Customers created:', customerRecords.length)

    // ============================================
    // 5. VENDORS (Suppliers)
    // ============================================
    const vendors = [
      {
        vendor_number: 'VEND-001',
        name: 'NOC Ethiopia (National Oil Company)',
        name_amharic: 'ብሔራዊ ነዳጅ ኩባንያ',
        email: 'sales@noc.com.et',
        phone: '+251-11-551-8000',
        tin_number: 'TIN-0011111111',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_15',
        address: { street: 'Gotera', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-002',
        name: 'Total Ethiopia',
        name_amharic: 'ቶታል ኢትዮጵያ',
        email: 'ethiopia@total.com',
        phone: '+251-11-552-9000',
        tin_number: 'TIN-0022222222',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_30',
        address: { street: 'Bole Road', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-003',
        name: 'Tsehay Tractor & Equipment',
        name_amharic: 'ፀሐይ ትራክተር',
        email: 'info@tsehaytractor.com',
        phone: '+251-11-661-2345',
        tin_number: 'TIN-0033333333',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_30',
        address: { street: 'Kality', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-004',
        name: 'Moenco (Motor & Engineering Co.)',
        name_amharic: 'ሞኢንኮ',
        email: 'parts@moenco.com.et',
        phone: '+251-11-442-5000',
        tin_number: 'TIN-0044444444',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_30',
        address: { street: 'Addis Ketema', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-005',
        name: 'Kaleb Steel Industry',
        name_amharic: 'ካሌብ ብረታ ብረት',
        email: 'sales@kalebsteel.com',
        phone: '+251-11-439-1234',
        tin_number: 'TIN-0055555555',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_15',
        address: { street: 'Akaki Industrial Zone', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-006',
        name: 'Nyala Insurance S.C.',
        name_amharic: 'ንያላ ኢንሹራንስ',
        email: 'corporate@nyalainsurance.com',
        phone: '+251-11-552-6000',
        tin_number: 'TIN-0066666666',
        vendor_type: 'SERVICE',
        payment_terms: 'NET_30',
        address: { street: 'Churchill Road', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-007',
        name: 'Hibret Tyre',
        name_amharic: 'ህብረት ጎማ',
        email: 'hibrettyre@ethionet.et',
        phone: '+251-11-551-3456',
        tin_number: 'TIN-0077777777',
        vendor_type: 'SUPPLIER',
        payment_terms: 'CASH',
        address: { street: 'Merkato', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-008',
        name: 'Sino Truck Ethiopia',
        name_amharic: 'ሲኖ ትራክ ኢትዮጵያ',
        email: 'ethiopia@sinotruk.com',
        phone: '+251-11-662-4567',
        tin_number: 'TIN-0088888888',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_45',
        address: { street: 'Kality', city: 'Addis Ababa', country: 'Ethiopia' }
      },
    ]

    const vendorRecords = vendors.map(v => ({
      id: generateId(),
      company_id: companyId,
      ...v,
      is_active: true,
      balance: Math.floor(Math.random() * 200000) // Random payable balance
    }))

    const { error: vendError } = await supabase.from('vendors').insert(vendorRecords)
    if (vendError) throw vendError
    console.log('✅ Vendors created:', vendorRecords.length)

    // ============================================
    // 6. INVENTORY ITEMS (Equipment for Rent)
    // ============================================
    const items = [
      // Excavators
      { sku: 'EXC-320', name: 'CAT 320D Excavator', name_am: 'ካት 320 አፈር ቆፋሪ', category: 'Excavators', type: 'SERVICE', selling_price: 15000, cost_price: 0, unit_of_measure: 'Day', description: '20-ton hydraulic excavator, ideal for medium construction' },
      { sku: 'EXC-330', name: 'CAT 330D Excavator', name_am: 'ካት 330 አፈር ቆፋሪ', category: 'Excavators', type: 'SERVICE', selling_price: 22000, cost_price: 0, unit_of_measure: 'Day', description: '30-ton excavator for heavy-duty earthwork' },
      { sku: 'EXC-KOMATSU', name: 'Komatsu PC200 Excavator', name_am: 'ኮማትሱ አፈር ቆፋሪ', category: 'Excavators', type: 'SERVICE', selling_price: 14000, cost_price: 0, unit_of_measure: 'Day', description: '20-ton Komatsu excavator' },

      // Loaders
      { sku: 'LDR-950', name: 'CAT 950H Wheel Loader', name_am: 'ካት 950 ሎደር', category: 'Loaders', type: 'SERVICE', selling_price: 12000, cost_price: 0, unit_of_measure: 'Day', description: 'Medium wheel loader with 3.5m³ bucket' },
      { sku: 'LDR-966', name: 'CAT 966H Wheel Loader', name_am: 'ካት 966 ሎደር', category: 'Loaders', type: 'SERVICE', selling_price: 16000, cost_price: 0, unit_of_measure: 'Day', description: 'Large wheel loader with 4.5m³ bucket' },
      { sku: 'LDR-SDLG', name: 'SDLG LG956L Loader', name_am: 'ኤስዲኤልጂ ሎደር', category: 'Loaders', type: 'SERVICE', selling_price: 9000, cost_price: 0, unit_of_measure: 'Day', description: 'Chinese wheel loader, 3.0m³ bucket' },

      // Bulldozers
      { sku: 'BDZ-D6', name: 'CAT D6R Bulldozer', name_am: 'ካት D6 ቡልዶዘር', category: 'Bulldozers', type: 'SERVICE', selling_price: 18000, cost_price: 0, unit_of_measure: 'Day', description: 'Medium bulldozer for earthmoving' },
      { sku: 'BDZ-D7', name: 'CAT D7R Bulldozer', name_am: 'ካት D7 ቡልዶዘር', category: 'Bulldozers', type: 'SERVICE', selling_price: 25000, cost_price: 0, unit_of_measure: 'Day', description: 'Large bulldozer for heavy earthwork' },
      { sku: 'BDZ-D8', name: 'CAT D8T Bulldozer', name_am: 'ካት D8 ቡልዶዘር', category: 'Bulldozers', type: 'SERVICE', selling_price: 35000, cost_price: 0, unit_of_measure: 'Day', description: 'Extra-large bulldozer for major projects' },

      // Cranes
      { sku: 'CRN-25T', name: 'Mobile Crane 25 Ton', name_am: '25 ቶን ክሬን', category: 'Cranes', type: 'SERVICE', selling_price: 28000, cost_price: 0, unit_of_measure: 'Day', description: '25-ton mobile crane' },
      { sku: 'CRN-50T', name: 'Mobile Crane 50 Ton', name_am: '50 ቶን ክሬን', category: 'Cranes', type: 'SERVICE', selling_price: 45000, cost_price: 0, unit_of_measure: 'Day', description: '50-ton mobile crane' },
      { sku: 'CRN-100T', name: 'Mobile Crane 100 Ton', name_am: '100 ቶን ክሬን', category: 'Cranes', type: 'SERVICE', selling_price: 75000, cost_price: 0, unit_of_measure: 'Day', description: '100-ton mobile crane for heavy lifts' },

      // Dump Trucks
      { sku: 'DMP-20', name: 'Sino Truck Dump 20m³', name_am: 'ሲኖ ቆሻሻ ጭነት', category: 'Dump Trucks', type: 'SERVICE', selling_price: 8500, cost_price: 0, unit_of_measure: 'Day', description: '20m³ dump truck' },
      { sku: 'DMP-30', name: 'Sino Truck Dump 30m³', name_am: 'ሲኖ ቆሻሻ ጭነት', category: 'Dump Trucks', type: 'SERVICE', selling_price: 10000, cost_price: 0, unit_of_measure: 'Day', description: '30m³ dump truck' },

      // Compactors & Rollers
      { sku: 'RLR-SINGLE', name: 'Single Drum Roller', name_am: 'ነጠላ ሮለር', category: 'Compactors', type: 'SERVICE', selling_price: 7500, cost_price: 0, unit_of_measure: 'Day', description: 'Vibratory single drum roller for compaction' },
      { sku: 'RLR-DOUBLE', name: 'Double Drum Roller', name_am: 'ድርብ ሮለር', category: 'Compactors', type: 'SERVICE', selling_price: 8500, cost_price: 0, unit_of_measure: 'Day', description: 'Double drum asphalt roller' },
      { sku: 'RLR-PNEUMATIC', name: 'Pneumatic Tire Roller', name_am: 'የጎማ ሮለር', category: 'Compactors', type: 'SERVICE', selling_price: 9000, cost_price: 0, unit_of_measure: 'Day', description: 'Pneumatic tire roller for finishing' },

      // Graders
      { sku: 'GRD-140', name: 'CAT 140H Motor Grader', name_am: 'ካት ግሬደር', category: 'Graders', type: 'SERVICE', selling_price: 16000, cost_price: 0, unit_of_measure: 'Day', description: 'Motor grader for road leveling' },

      // Concrete Equipment
      { sku: 'MIX-TRUCK', name: 'Concrete Mixer Truck', name_am: 'ኮንክሪት ቀላቃይ', category: 'Concrete', type: 'SERVICE', selling_price: 8000, cost_price: 0, unit_of_measure: 'Day', description: '8m³ concrete mixer truck' },
      { sku: 'MIX-BATCH', name: 'Batching Plant', name_am: 'ባችንግ ፕላንት', category: 'Concrete', type: 'SERVICE', selling_price: 25000, cost_price: 0, unit_of_measure: 'Day', description: 'Mobile concrete batching plant 60m³/hr' },

      // Services
      { sku: 'SRV-OPERATOR', name: 'Equipment Operator', name_am: 'የማሽን ኦፕሬተር', category: 'Services', type: 'SERVICE', selling_price: 800, cost_price: 0, unit_of_measure: 'Day', description: 'Skilled equipment operator' },
      { sku: 'SRV-TRANSPORT', name: 'Equipment Transport', name_am: 'የማሽን ማጓጓዣ', category: 'Services', type: 'SERVICE', selling_price: 15000, cost_price: 0, unit_of_measure: 'Trip', description: 'Low-bed trailer transport within Addis' },
      { sku: 'SRV-TRANS-OUT', name: 'Transport (Outside Addis)', name_am: 'ከአዲስ አበባ ውጪ ማጓጓዣ', category: 'Services', type: 'SERVICE', selling_price: 35, cost_price: 0, unit_of_measure: 'KM', description: 'Per kilometer charge outside Addis Ababa' },

      // Consumables (for internal use)
      { sku: 'FUEL-DIESEL', name: 'Diesel Fuel', name_am: 'ናፍጣ', category: 'Consumables', type: 'INVENTORY', selling_price: 0, cost_price: 65, unit_of_measure: 'Liter', quantity_on_hand: 5000, reorder_point: 2000 },
      { sku: 'OIL-ENGINE', name: 'Engine Oil 15W-40', name_am: 'የሞተር ዘይት', category: 'Consumables', type: 'INVENTORY', selling_price: 0, cost_price: 450, unit_of_measure: 'Liter', quantity_on_hand: 200, reorder_point: 50 },
      { sku: 'OIL-HYDRAULIC', name: 'Hydraulic Oil', name_am: 'ሃይድሮሊክ ዘይት', category: 'Consumables', type: 'INVENTORY', selling_price: 0, cost_price: 380, unit_of_measure: 'Liter', quantity_on_hand: 300, reorder_point: 100 },
    ]

    const itemRecords = items.map(item => ({
      id: generateId(),
      company_id: companyId,
      ...item,
      is_active: true,
      taxable: true
    }))

    const { error: itemError } = await supabase.from('items').insert(itemRecords)
    if (itemError) throw itemError
    console.log('✅ Inventory items created:', itemRecords.length)

    // ============================================
    // 7. EMPLOYEES
    // ============================================
    const employees = [
      { employee_code: 'EMP-001', first_name: 'Dawit', last_name: 'Bekele', first_name_am: 'ዳዊት', last_name_am: 'በቀለ', email: 'dawit@abyssinia-equipment.com.et', phone: '+251-91-123-0001', department: 'Management', job_title: 'General Manager', pay_rate: 85000, pay_type: 'SALARY' },
      { employee_code: 'EMP-002', first_name: 'Tigist', last_name: 'Haile', first_name_am: 'ትግስት', last_name_am: 'ኃይሌ', email: 'tigist@abyssinia-equipment.com.et', phone: '+251-91-123-0002', department: 'Finance', job_title: 'Finance Manager', pay_rate: 65000, pay_type: 'SALARY' },
      { employee_code: 'EMP-003', first_name: 'Yohannes', last_name: 'Gebre', first_name_am: 'ዮሐንስ', last_name_am: 'ገብሬ', email: 'yohannes@abyssinia-equipment.com.et', phone: '+251-91-123-0003', department: 'Operations', job_title: 'Operations Manager', pay_rate: 55000, pay_type: 'SALARY' },
      { employee_code: 'EMP-004', first_name: 'Meseret', last_name: 'Tadesse', first_name_am: 'መሰረት', last_name_am: 'ታደሰ', email: 'meseret@abyssinia-equipment.com.et', phone: '+251-91-123-0004', department: 'Finance', job_title: 'Accountant', pay_rate: 35000, pay_type: 'SALARY' },
      { employee_code: 'EMP-005', first_name: 'Solomon', last_name: 'Kebede', first_name_am: 'ሰለሞን', last_name_am: 'ከበደ', email: 'solomon@abyssinia-equipment.com.et', phone: '+251-91-123-0005', department: 'Maintenance', job_title: 'Chief Mechanic', pay_rate: 45000, pay_type: 'SALARY' },
      { employee_code: 'EMP-006', first_name: 'Abebe', last_name: 'Worku', first_name_am: 'አበበ', last_name_am: 'ወርቁ', email: 'abebe.w@abyssinia-equipment.com.et', phone: '+251-91-123-0006', department: 'Operations', job_title: 'Excavator Operator', pay_rate: 1200, pay_type: 'DAILY' },
      { employee_code: 'EMP-007', first_name: 'Tesfaye', last_name: 'Girma', first_name_am: 'ተስፋዬ', last_name_am: 'ግርማ', email: 'tesfaye.g@abyssinia-equipment.com.et', phone: '+251-91-123-0007', department: 'Operations', job_title: 'Crane Operator', pay_rate: 1500, pay_type: 'DAILY' },
      { employee_code: 'EMP-008', first_name: 'Kebede', last_name: 'Alemu', first_name_am: 'ከበደ', last_name_am: 'አለሙ', email: 'kebede.a@abyssinia-equipment.com.et', phone: '+251-91-123-0008', department: 'Operations', job_title: 'Loader Operator', pay_rate: 1100, pay_type: 'DAILY' },
      { employee_code: 'EMP-009', first_name: 'Mulugeta', last_name: 'Desta', first_name_am: 'ሙሉጌታ', last_name_am: 'ደስታ', email: 'mulugeta.d@abyssinia-equipment.com.et', phone: '+251-91-123-0009', department: 'Operations', job_title: 'Bulldozer Operator', pay_rate: 1300, pay_type: 'DAILY' },
      { employee_code: 'EMP-010', first_name: 'Bereket', last_name: 'Teshome', first_name_am: 'በረከት', last_name_am: 'ተሾመ', email: 'bereket@abyssinia-equipment.com.et', phone: '+251-91-123-0010', department: 'Operations', job_title: 'Grader Operator', pay_rate: 1200, pay_type: 'DAILY' },
      { employee_code: 'EMP-011', first_name: 'Getachew', last_name: 'Mengistu', first_name_am: 'ጌታቸው', last_name_am: 'መንግስቱ', email: 'getachew@abyssinia-equipment.com.et', phone: '+251-91-123-0011', department: 'Maintenance', job_title: 'Mechanic', pay_rate: 900, pay_type: 'DAILY' },
      { employee_code: 'EMP-012', first_name: 'Hanna', last_name: 'Assefa', first_name_am: 'ሐና', last_name_am: 'አሰፋ', email: 'hanna@abyssinia-equipment.com.et', phone: '+251-91-123-0012', department: 'Admin', job_title: 'Secretary', pay_rate: 18000, pay_type: 'SALARY' },
      { employee_code: 'EMP-013', first_name: 'Mesfin', last_name: 'Belay', first_name_am: 'መስፍን', last_name_am: 'በላይ', email: 'mesfin@abyssinia-equipment.com.et', phone: '+251-91-123-0013', department: 'Transport', job_title: 'Low-bed Driver', pay_rate: 1000, pay_type: 'DAILY' },
      { employee_code: 'EMP-014', first_name: 'Alem', last_name: 'Woldemariam', first_name_am: 'አለም', last_name_am: 'ወልደማርያም', email: 'alem@abyssinia-equipment.com.et', phone: '+251-91-123-0014', department: 'Sales', job_title: 'Sales Representative', pay_rate: 25000, pay_type: 'SALARY' },
      { employee_code: 'EMP-015', first_name: 'Sisay', last_name: 'Yilma', first_name_am: 'ስሳይ', last_name_am: 'ይልማ', email: 'sisay@abyssinia-equipment.com.et', phone: '+251-91-123-0015', department: 'Security', job_title: 'Security Guard', pay_rate: 600, pay_type: 'DAILY' },
    ]

    const employeeRecords = employees.map(emp => ({
      id: generateId(),
      company_id: companyId,
      ...emp,
      hire_date: '2023-01-15',
      is_active: true
    }))

    const { error: empError } = await supabase.from('employees').insert(employeeRecords)
    if (empError) throw empError
    console.log('✅ Employees created:', employeeRecords.length)

    // ============================================
    // 8. BANK ACCOUNTS
    // ============================================
    const bankAccounts = [
      {
        account_name: 'CBE Main Account',
        account_number: '1000123456789',
        bank_name: 'Commercial Bank of Ethiopia',
        account_type: 'CHECKING',
        currency: 'ETB',
        current_balance: 2450000,
        is_active: true
      },
      {
        account_name: 'Awash Bank Savings',
        account_number: '0123456789012',
        bank_name: 'Awash Bank',
        account_type: 'SAVINGS',
        currency: 'ETB',
        current_balance: 1875000,
        is_active: true
      },
      {
        account_name: 'Petty Cash',
        account_number: 'PETTY-001',
        bank_name: 'Cash on Hand',
        account_type: 'CASH',
        currency: 'ETB',
        current_balance: 125000,
        is_active: true
      }
    ]

    const bankRecords = bankAccounts.map(bank => ({
      id: generateId(),
      company_id: companyId,
      ...bank
    }))

    const { error: bankError } = await supabase.from('bank_accounts').insert(bankRecords)
    if (bankError) throw bankError
    console.log('✅ Bank accounts created:', bankRecords.length)

    // ============================================
    // DONE
    // ============================================
    console.log('')
    console.log('🎉 ===== SEED COMPLETE =====')
    console.log(`   Company: ${company.name}`)
    console.log(`   Accounts: ${chartOfAccounts.length}`)
    console.log(`   Customers: ${customerRecords.length}`)
    console.log(`   Vendors: ${vendorRecords.length}`)
    console.log(`   Items: ${itemRecords.length}`)
    console.log(`   Employees: ${employeeRecords.length}`)
    console.log(`   Bank Accounts: ${bankRecords.length}`)
    console.log('')
    console.log('   Login: demo@sageflow.app / demo123')
    console.log('============================')

    return { success: true, companyId }

  } catch (error: any) {
    console.error('❌ Seed failed:', error)
    return { success: false, error: error.message }
  }
}

// Run if called directly
if (typeof window !== 'undefined') {
  // Browser environment - can be called from console
  (window as any).seedDemoConstructionCompany = seedDemoConstructionCompany
}
