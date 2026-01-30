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
      name: 'Abyssinia Heavy Equipment Rental (አቢሲኒያ ከባድ መሳሪያ ኪራይ)',
      email: 'info@abyssinia-equipment.com.et',
      phone: '+251-11-551-2345',
      address: 'Bole Road, Africa Avenue, Addis Ababa, Ethiopia',
      tax_id: 'TIN-0012345678',
      currency: 'ETB',
      settings: {
        industry: 'Construction Equipment Rental',
        vat_number: 'VAT-0012345678',
        fiscal_year_start: '2024-07-08',
        founded_year: 2018
      }
    }

    const { error: companyError } = await supabase.from('companies').insert(company)
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
      { account_number: '1000', account_name: 'Cash on Hand (በእጅ ያለ ጥሬ ገንዘብ)', type: 'ASSET', balance: 125000 },
      { account_number: '1010', account_name: 'Commercial Bank of Ethiopia (የኢትዮጵያ ንግድ ባንክ)', type: 'ASSET', balance: 2450000 },
      { account_number: '1020', account_name: 'Awash Bank (አዋሽ ባንክ)', type: 'ASSET', balance: 1875000 },
      { account_number: '1100', account_name: 'Accounts Receivable (የሚሰበሰብ ሂሳብ)', type: 'ASSET', balance: 3250000 },
      { account_number: '1150', account_name: 'Prepaid Insurance (ቅድመ ክፍያ ኢንሹራንስ)', type: 'ASSET', balance: 180000 },
      { account_number: '1200', account_name: 'Fuel Inventory (የነዳጅ ክምችት)', type: 'ASSET', balance: 450000 },
      { account_number: '1210', account_name: 'Spare Parts Inventory (የመለዋወጫ ክምችት)', type: 'ASSET', balance: 890000 },
      { account_number: '1500', account_name: 'Heavy Equipment - Cost (ከባድ መሳሪያዎች)', type: 'ASSET', balance: 45000000 },
      { account_number: '1510', account_name: 'Accumulated Depreciation (የተከማቸ ዋጋ ቅናሽ)', type: 'ASSET', balance: -12500000 },
      { account_number: '1600', account_name: 'Vehicles (ተሽከርካሪዎች)', type: 'ASSET', balance: 8500000 },
      { account_number: '1700', account_name: 'Office Equipment (የቢሮ መሳሪያዎች)', type: 'ASSET', balance: 350000 },

      // Liabilities (2xxx) - እዳ
      { account_number: '2000', account_name: 'Accounts Payable (የሚከፈል ሂሳብ)', type: 'LIABILITY', balance: 1250000 },
      { account_number: '2100', account_name: 'VAT Payable 15% (የሚከፈል ተ.እ.ታ)', type: 'LIABILITY', balance: 485000 },
      { account_number: '2110', account_name: 'Withholding Tax Payable 2% (የግብር ቅነሳ)', type: 'LIABILITY', balance: 95000 },
      { account_number: '2200', account_name: 'Salaries Payable (የሚከፈል ደመወዝ)', type: 'LIABILITY', balance: 680000 },
      { account_number: '2300', account_name: 'Pension Contribution Payable (የጡረታ መዋጮ)', type: 'LIABILITY', balance: 125000 },
      { account_number: '2500', account_name: 'Bank Loan - CBE (የባንክ ብድር)', type: 'LIABILITY', balance: 15000000 },

      // Equity (3xxx) - ካፒታል
      { account_number: '3000', account_name: 'Owners Capital (የባለቤት ካፒታል)', type: 'EQUITY', balance: 25000000 },
      { account_number: '3100', account_name: 'Retained Earnings (የተያዘ ትርፍ)', type: 'EQUITY', balance: 8500000 },
      { account_number: '3200', account_name: 'Current Year Earnings (የዘንድሮ ትርፍ)', type: 'EQUITY', balance: 0 },

      // Revenue (4xxx) - ገቢ
      { account_number: '4000', account_name: 'Equipment Rental Income (የመሳሪያ ኪራይ ገቢ)', type: 'REVENUE', balance: 0 },
      { account_number: '4010', account_name: 'Excavator Rental (የአፈር ቆፋሪ ኪራይ)', type: 'REVENUE', balance: 0 },
      { account_number: '4020', account_name: 'Loader Rental (የሎደር ኪራይ)', type: 'REVENUE', balance: 0 },
      { account_number: '4030', account_name: 'Crane Rental (የክሬን ኪራይ)', type: 'REVENUE', balance: 0 },
      { account_number: '4040', account_name: 'Bulldozer Rental (የቡልዶዘር ኪራይ)', type: 'REVENUE', balance: 0 },
      { account_number: '4100', account_name: 'Operator Services (የኦፕሬተር አገልግሎት)', type: 'REVENUE', balance: 0 },
      { account_number: '4200', account_name: 'Transportation Fees (የትራንስፖርት ክፍያ)', type: 'REVENUE', balance: 0 },
      { account_number: '4900', account_name: 'Other Income (ሌላ ገቢ)', type: 'REVENUE', balance: 0 },

      // Expenses (5xxx-6xxx) - ወጪ
      { account_number: '5000', account_name: 'Fuel Expense (የነዳጅ ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '5100', account_name: 'Maintenance & Repairs (ጥገና እና እድሳት)', type: 'EXPENSE', balance: 0 },
      { account_number: '5200', account_name: 'Spare Parts Expense (የመለዋወጫ ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '5300', account_name: 'Insurance Expense (የኢንሹራንስ ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '5400', account_name: 'Depreciation Expense (የዋጋ ቅናሽ ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '6000', account_name: 'Salaries & Wages (ደመወዝ እና አበል)', type: 'EXPENSE', balance: 0 },
      { account_number: '6100', account_name: 'Operator Wages (የኦፕሬተር ደመወዝ)', type: 'EXPENSE', balance: 0 },
      { account_number: '6200', account_name: 'Employee Benefits (የሰራተኛ ጥቅማጥቅም)', type: 'EXPENSE', balance: 0 },
      { account_number: '6300', account_name: 'Pension Expense 7% (የጡረታ ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '6500', account_name: 'Office Rent (የቢሮ ኪራይ)', type: 'EXPENSE', balance: 0 },
      { account_number: '6600', account_name: 'Utilities (የመገልገያ ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '6700', account_name: 'Transportation Expense (የትራንስፖርት ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '6800', account_name: 'Bank Charges (የባንክ ክፍያ)', type: 'EXPENSE', balance: 0 },
      { account_number: '6900', account_name: 'Interest Expense (የወለድ ወጪ)', type: 'EXPENSE', balance: 0 },
      { account_number: '7000', account_name: 'Miscellaneous Expense (ልዩ ልዩ ወጪ)', type: 'EXPENSE', balance: 0 },
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
        name: 'MIDROC Construction PLC (ሚድሮክ ኮንስትራክሽን)',
        email: 'procurement@midroc.com.et',
        phone: '+251-11-661-5000',
        tax_id: 'TIN-0034567890',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 5000000,
        billing_address: { street: 'Bole Sub City, Woreda 03', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-002',
        name: 'Sur Construction Share Company (ሱር ኮንስትራክሽን)',
        email: 'info@surconstruction.com.et',
        phone: '+251-11-552-3456',
        tax_id: 'TIN-0045678901',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 3500000,
        billing_address: { street: 'Kirkos Sub City', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-003',
        name: 'Ethiopian Roads Authority (የኢትዮጵያ መንገዶች ባለስልጣን)',
        email: 'era@ethionet.et',
        phone: '+251-11-551-6000',
        tax_id: 'TIN-0001234567',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_45',
        credit_limit: 10000000,
        billing_address: { street: 'Ras Abebe Aregay Street', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-004',
        name: 'CGC Overseas Construction Group (ሲጂሲ ኦቨርሲዝ)',
        email: 'ethiopia@cgcoc.com.cn',
        phone: '+251-11-662-8900',
        tax_id: 'TIN-0056789012',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_15',
        credit_limit: 8000000,
        billing_address: { street: 'CMC Road', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-005',
        name: 'Yotek Construction (ዮቴክ ኮንስትራክሽን)',
        email: 'yotek@ethionet.et',
        phone: '+251-11-553-2100',
        tax_id: 'TIN-0067890123',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 2500000,
        billing_address: { street: 'Megenagna', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-006',
        name: 'Ovid Construction PLC (ኦቪድ ኮንስትራክሽን)',
        email: 'info@ovidconstruction.com',
        phone: '+251-11-554-7800',
        tax_id: 'TIN-0078901234',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        credit_limit: 4000000,
        billing_address: { street: 'Gerji', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-007',
        name: 'Sunshine Construction (ሳንሻይን ኮንስትራክሽን)',
        email: 'sunshine@gmail.com',
        phone: '+251-91-123-4567',
        tax_id: 'TIN-0089012345',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_15',
        credit_limit: 1500000,
        billing_address: { street: 'Aware', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-008',
        name: 'METEC (ሜቴክ)',
        email: 'metec@ethionet.et',
        phone: '+251-11-646-5000',
        tax_id: 'TIN-0002345678',
        customer_type: 'CORPORATE',
        payment_terms: 'NET_60',
        credit_limit: 15000000,
        billing_address: { street: 'Akaki Kality', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-009',
        name: 'Ato Mulugeta Tadesse (አቶ ሙሉጌታ ታደሰ)',
        email: 'mulugeta.tadesse@gmail.com',
        phone: '+251-91-234-5678',
        tax_id: 'TIN-0090123456',
        customer_type: 'RETAIL',
        payment_terms: 'CASH',
        credit_limit: 500000,
        billing_address: { street: 'Sarbet', city: 'Addis Ababa', region: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        customer_number: 'CUST-010',
        name: 'Addis Ababa City Roads Authority (የአዲስ አበባ ከተማ መንገዶች)',
        email: 'aacra@addisababa.gov.et',
        phone: '+251-11-551-1234',
        tax_id: 'TIN-0003456789',
        customer_type: 'CORPORATE',
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
      balance: Math.floor(Math.random() * 500000)
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
        name: 'NOC Ethiopia (ብሔራዊ ነዳጅ ኩባንያ)',
        email: 'sales@noc.com.et',
        phone: '+251-11-551-8000',
        tax_id: 'TIN-0011111111',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_15',
        address: { street: 'Gotera', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-002',
        name: 'Total Ethiopia (ቶታል ኢትዮጵያ)',
        email: 'ethiopia@total.com',
        phone: '+251-11-552-9000',
        tax_id: 'TIN-0022222222',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_30',
        address: { street: 'Bole Road', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-003',
        name: 'Tsehay Tractor & Equipment (ፀሐይ ትራክተር)',
        email: 'info@tsehaytractor.com',
        phone: '+251-11-661-2345',
        tax_id: 'TIN-0033333333',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_30',
        address: { street: 'Kality', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-004',
        name: 'Moenco (ሞኢንኮ)',
        email: 'parts@moenco.com.et',
        phone: '+251-11-442-5000',
        tax_id: 'TIN-0044444444',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_30',
        address: { street: 'Addis Ketema', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-005',
        name: 'Kaleb Steel Industry (ካሌብ ብረታ ብረት)',
        email: 'sales@kalebsteel.com',
        phone: '+251-11-439-1234',
        tax_id: 'TIN-0055555555',
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_15',
        address: { street: 'Akaki Industrial Zone', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-006',
        name: 'Nyala Insurance S.C. (ንያላ ኢንሹራንስ)',
        email: 'corporate@nyalainsurance.com',
        phone: '+251-11-552-6000',
        tax_id: 'TIN-0066666666',
        vendor_type: 'SERVICE',
        payment_terms: 'NET_30',
        address: { street: 'Churchill Road', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-007',
        name: 'Hibret Tyre (ህብረት ጎማ)',
        email: 'hibrettyre@ethionet.et',
        phone: '+251-11-551-3456',
        tax_id: 'TIN-0077777777',
        vendor_type: 'SUPPLIER',
        payment_terms: 'CASH',
        address: { street: 'Merkato', city: 'Addis Ababa', country: 'Ethiopia' }
      },
      {
        vendor_number: 'VEND-008',
        name: 'Sino Truck Ethiopia (ሲኖ ትራክ ኢትዮጵያ)',
        email: 'ethiopia@sinotruk.com',
        phone: '+251-11-662-4567',
        tax_id: 'TIN-0088888888',
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
      balance: Math.floor(Math.random() * 200000)
    }))

    const { error: vendError } = await supabase.from('vendors').insert(vendorRecords)
    if (vendError) throw vendError
    console.log('✅ Vendors created:', vendorRecords.length)

    // ============================================
    // 6. INVENTORY ITEMS (Equipment for Rent)
    // ============================================
    const items = [
      // Excavators
      { sku: 'EXC-320', name: 'CAT 320D Excavator (ካት 320 አፈር ቆፋሪ)', type: 'SERVICE', selling_price: 15000, cost_price: 0, unit_of_measure: 'Day', description: '20-ton hydraulic excavator, ideal for medium construction' },
      { sku: 'EXC-330', name: 'CAT 330D Excavator (ካት 330 አፈር ቆፋሪ)', type: 'SERVICE', selling_price: 22000, cost_price: 0, unit_of_measure: 'Day', description: '30-ton excavator for heavy-duty earthwork' },
      { sku: 'EXC-KOMATSU', name: 'Komatsu PC200 Excavator (ኮማትሱ)', type: 'SERVICE', selling_price: 14000, cost_price: 0, unit_of_measure: 'Day', description: '20-ton Komatsu excavator' },

      // Loaders
      { sku: 'LDR-950', name: 'CAT 950H Wheel Loader (ካት 950 ሎደር)', type: 'SERVICE', selling_price: 12000, cost_price: 0, unit_of_measure: 'Day', description: 'Medium wheel loader with 3.5m³ bucket' },
      { sku: 'LDR-966', name: 'CAT 966H Wheel Loader (ካት 966 ሎደር)', type: 'SERVICE', selling_price: 16000, cost_price: 0, unit_of_measure: 'Day', description: 'Large wheel loader with 4.5m³ bucket' },
      { sku: 'LDR-SDLG', name: 'SDLG LG956L Loader (ኤስዲኤልጂ ሎደር)', type: 'SERVICE', selling_price: 9000, cost_price: 0, unit_of_measure: 'Day', description: 'Chinese wheel loader, 3.0m³ bucket' },

      // Bulldozers
      { sku: 'BDZ-D6', name: 'CAT D6R Bulldozer (ካት D6 ቡልዶዘር)', type: 'SERVICE', selling_price: 18000, cost_price: 0, unit_of_measure: 'Day', description: 'Medium bulldozer for earthmoving' },
      { sku: 'BDZ-D7', name: 'CAT D7R Bulldozer (ካት D7 ቡልዶዘር)', type: 'SERVICE', selling_price: 25000, cost_price: 0, unit_of_measure: 'Day', description: 'Large bulldozer for heavy earthwork' },
      { sku: 'BDZ-D8', name: 'CAT D8T Bulldozer (ካት D8 ቡልዶዘር)', type: 'SERVICE', selling_price: 35000, cost_price: 0, unit_of_measure: 'Day', description: 'Extra-large bulldozer for major projects' },

      // Cranes
      { sku: 'CRN-25T', name: 'Mobile Crane 25 Ton (25 ቶን ክሬን)', type: 'SERVICE', selling_price: 28000, cost_price: 0, unit_of_measure: 'Day', description: '25-ton mobile crane' },
      { sku: 'CRN-50T', name: 'Mobile Crane 50 Ton (50 ቶን ክሬን)', type: 'SERVICE', selling_price: 45000, cost_price: 0, unit_of_measure: 'Day', description: '50-ton mobile crane' },
      { sku: 'CRN-100T', name: 'Mobile Crane 100 Ton (100 ቶን ክሬን)', type: 'SERVICE', selling_price: 75000, cost_price: 0, unit_of_measure: 'Day', description: '100-ton mobile crane for heavy lifts' },

      // Dump Trucks
      { sku: 'DMP-20', name: 'Sino Truck Dump 20m³ (ሲኖ ቆሻሻ ጭነት)', type: 'SERVICE', selling_price: 8500, cost_price: 0, unit_of_measure: 'Day', description: '20m³ dump truck' },
      { sku: 'DMP-30', name: 'Sino Truck Dump 30m³ (ሲኖ ቆሻሻ ጭነት)', type: 'SERVICE', selling_price: 10000, cost_price: 0, unit_of_measure: 'Day', description: '30m³ dump truck' },

      // Compactors & Rollers
      { sku: 'RLR-SINGLE', name: 'Single Drum Roller (ነጠላ ሮለር)', type: 'SERVICE', selling_price: 7500, cost_price: 0, unit_of_measure: 'Day', description: 'Vibratory single drum roller' },
      { sku: 'RLR-DOUBLE', name: 'Double Drum Roller (ድርብ ሮለር)', type: 'SERVICE', selling_price: 8500, cost_price: 0, unit_of_measure: 'Day', description: 'Double drum asphalt roller' },
      { sku: 'RLR-PNEUMATIC', name: 'Pneumatic Tire Roller (የጎማ ሮለር)', type: 'SERVICE', selling_price: 9000, cost_price: 0, unit_of_measure: 'Day', description: 'Pneumatic tire roller for finishing' },

      // Graders
      { sku: 'GRD-140', name: 'CAT 140H Motor Grader (ካት ግሬደር)', type: 'SERVICE', selling_price: 16000, cost_price: 0, unit_of_measure: 'Day', description: 'Motor grader for road leveling' },

      // Concrete Equipment
      { sku: 'MIX-TRUCK', name: 'Concrete Mixer Truck (ኮንክሪት ቀላቃይ)', type: 'SERVICE', selling_price: 8000, cost_price: 0, unit_of_measure: 'Day', description: '8m³ concrete mixer truck' },
      { sku: 'MIX-BATCH', name: 'Batching Plant (ባችንግ ፕላንት)', type: 'SERVICE', selling_price: 25000, cost_price: 0, unit_of_measure: 'Day', description: 'Mobile concrete batching plant 60m³/hr' },

      // Services
      { sku: 'SRV-OPERATOR', name: 'Equipment Operator (የማሽን ኦፕሬተር)', type: 'SERVICE', selling_price: 800, cost_price: 0, unit_of_measure: 'Day', description: 'Skilled equipment operator' },
      { sku: 'SRV-TRANSPORT', name: 'Equipment Transport (የማሽን ማጓጓዣ)', type: 'SERVICE', selling_price: 15000, cost_price: 0, unit_of_measure: 'Trip', description: 'Low-bed trailer transport within Addis' },
      { sku: 'SRV-TRANS-KM', name: 'Transport Outside Addis (ከአዲስ አበባ ውጪ)', type: 'SERVICE', selling_price: 35, cost_price: 0, unit_of_measure: 'KM', description: 'Per kilometer charge outside Addis Ababa' },

      // Consumables (for internal use)
      { sku: 'FUEL-DIESEL', name: 'Diesel Fuel (ናፍጣ)', type: 'PRODUCT', selling_price: 0, cost_price: 65, unit_of_measure: 'Liter', quantity_on_hand: 5000, reorder_point: 2000 },
      { sku: 'OIL-ENGINE', name: 'Engine Oil 15W-40 (የሞተር ዘይት)', type: 'PRODUCT', selling_price: 0, cost_price: 450, unit_of_measure: 'Liter', quantity_on_hand: 200, reorder_point: 50 },
      { sku: 'OIL-HYDRAULIC', name: 'Hydraulic Oil (ሃይድሮሊክ ዘይት)', type: 'PRODUCT', selling_price: 0, cost_price: 380, unit_of_measure: 'Liter', quantity_on_hand: 300, reorder_point: 100 },
    ]

    const itemRecords = items.map(item => ({
      id: generateId(),
      company_id: companyId,
      ...item,
      is_active: true,
      taxable: true,
      reorder_point: item.reorder_point || 0,
      reorder_quantity: 0,
      quantity_on_hand: item.quantity_on_hand || 0
    }))

    const { error: itemError } = await supabase.from('items').insert(itemRecords)
    if (itemError) throw itemError
    console.log('✅ Inventory items created:', itemRecords.length)

    // ============================================
    // 7. EMPLOYEES
    // ============================================
    const employees = [
      { employee_code: 'EMP-001', first_name: 'Dawit (ዳዊት)', last_name: 'Bekele (በቀለ)', email: 'dawit@abyssinia-equipment.com.et', phone: '+251-91-123-0001', department: 'Management', job_title: 'General Manager', pay_rate: 85000, pay_method: 'SALARY' },
      { employee_code: 'EMP-002', first_name: 'Tigist (ትግስት)', last_name: 'Haile (ኃይሌ)', email: 'tigist@abyssinia-equipment.com.et', phone: '+251-91-123-0002', department: 'Finance', job_title: 'Finance Manager', pay_rate: 65000, pay_method: 'SALARY' },
      { employee_code: 'EMP-003', first_name: 'Yohannes (ዮሐንስ)', last_name: 'Gebre (ገብሬ)', email: 'yohannes@abyssinia-equipment.com.et', phone: '+251-91-123-0003', department: 'Operations', job_title: 'Operations Manager', pay_rate: 55000, pay_method: 'SALARY' },
      { employee_code: 'EMP-004', first_name: 'Meseret (መሰረት)', last_name: 'Tadesse (ታደሰ)', email: 'meseret@abyssinia-equipment.com.et', phone: '+251-91-123-0004', department: 'Finance', job_title: 'Accountant', pay_rate: 35000, pay_method: 'SALARY' },
      { employee_code: 'EMP-005', first_name: 'Solomon (ሰለሞን)', last_name: 'Kebede (ከበደ)', email: 'solomon@abyssinia-equipment.com.et', phone: '+251-91-123-0005', department: 'Maintenance', job_title: 'Chief Mechanic', pay_rate: 45000, pay_method: 'SALARY' },
      { employee_code: 'EMP-006', first_name: 'Abebe (አበበ)', last_name: 'Worku (ወርቁ)', email: 'abebe.w@abyssinia-equipment.com.et', phone: '+251-91-123-0006', department: 'Operations', job_title: 'Excavator Operator', pay_rate: 1200, pay_method: 'DAILY' },
      { employee_code: 'EMP-007', first_name: 'Tesfaye (ተስፋዬ)', last_name: 'Girma (ግርማ)', email: 'tesfaye.g@abyssinia-equipment.com.et', phone: '+251-91-123-0007', department: 'Operations', job_title: 'Crane Operator', pay_rate: 1500, pay_method: 'DAILY' },
      { employee_code: 'EMP-008', first_name: 'Kebede (ከበደ)', last_name: 'Alemu (አለሙ)', email: 'kebede.a@abyssinia-equipment.com.et', phone: '+251-91-123-0008', department: 'Operations', job_title: 'Loader Operator', pay_rate: 1100, pay_method: 'DAILY' },
      { employee_code: 'EMP-009', first_name: 'Mulugeta (ሙሉጌታ)', last_name: 'Desta (ደስታ)', email: 'mulugeta.d@abyssinia-equipment.com.et', phone: '+251-91-123-0009', department: 'Operations', job_title: 'Bulldozer Operator', pay_rate: 1300, pay_method: 'DAILY' },
      { employee_code: 'EMP-010', first_name: 'Bereket (በረከት)', last_name: 'Teshome (ተሾመ)', email: 'bereket@abyssinia-equipment.com.et', phone: '+251-91-123-0010', department: 'Operations', job_title: 'Grader Operator', pay_rate: 1200, pay_method: 'DAILY' },
      { employee_code: 'EMP-011', first_name: 'Getachew (ጌታቸው)', last_name: 'Mengistu (መንግስቱ)', email: 'getachew@abyssinia-equipment.com.et', phone: '+251-91-123-0011', department: 'Maintenance', job_title: 'Mechanic', pay_rate: 900, pay_method: 'DAILY' },
      { employee_code: 'EMP-012', first_name: 'Hanna (ሐና)', last_name: 'Assefa (አሰፋ)', email: 'hanna@abyssinia-equipment.com.et', phone: '+251-91-123-0012', department: 'Admin', job_title: 'Secretary', pay_rate: 18000, pay_method: 'SALARY' },
      { employee_code: 'EMP-013', first_name: 'Mesfin (መስፍን)', last_name: 'Belay (በላይ)', email: 'mesfin@abyssinia-equipment.com.et', phone: '+251-91-123-0013', department: 'Transport', job_title: 'Low-bed Driver', pay_rate: 1000, pay_method: 'DAILY' },
      { employee_code: 'EMP-014', first_name: 'Alem (አለም)', last_name: 'Woldemariam (ወልደማርያም)', email: 'alem@abyssinia-equipment.com.et', phone: '+251-91-123-0014', department: 'Sales', job_title: 'Sales Representative', pay_rate: 25000, pay_method: 'SALARY' },
      { employee_code: 'EMP-015', first_name: 'Sisay (ስሳይ)', last_name: 'Yilma (ይልማ)', email: 'sisay@abyssinia-equipment.com.et', phone: '+251-91-123-0015', department: 'Security', job_title: 'Security Guard', pay_rate: 600, pay_method: 'DAILY' },
    ]

    const employeeRecords = employees.map(emp => ({
      id: generateId(),
      company_id: companyId,
      ...emp,
      hire_date: new Date('2023-01-15').toISOString(),
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
