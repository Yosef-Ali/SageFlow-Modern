import { createClient } from '@supabase/supabase-js'
// @ts-ignore
import { config } from 'dotenv'
import { randomUUID } from 'crypto'

// Load .env.local
config({ path: '.env.local' })

// For seeding, we need the service role key (not the anon key)
// Get it from: Supabase Dashboard > Settings > API > service_role key
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING')
  console.error('\nTo seed the database, add SUPABASE_SERVICE_ROLE_KEY to your .env.local')
  console.error('Get it from: Supabase Dashboard > Settings > API > service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('Starting database seed...')
  console.log('Supabase URL:', supabaseUrl)

  // ============================================
  // Step 1: Create or get test company
  // ============================================
  let companyId: string

  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('email', 'test@sageflow.com')
    .single()

  if (existingCompany) {
    companyId = existingCompany.id
    console.log('Using existing company:', companyId)
  } else {
    companyId = randomUUID()
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        id: companyId,
        name: 'SageFlow Test Company',
        email: 'test@sageflow.com',
        phone: '+251911234567',
        address: 'Addis Ababa, Ethiopia',
        tax_id: 'ETH-123456',
        currency: 'ETB',
        settings: {
          fiscalYearStart: '01-01',
          dateFormat: 'DD/MM/YYYY',
          timezone: 'Africa/Addis_Ababa',
        }
      })
      .select()
      .single()

    if (companyError) {
      console.error('Error creating company:', companyError)
      process.exit(1)
    }

    console.log('Created test company:', newCompany.name, '(', companyId, ')')
  }

  // ============================================
  // Step 2: Create test user in Supabase Auth
  // ============================================
  const testEmail = 'admin@sageflow.com'
  const testPassword = 'password123'

  // Check if user already exists in Auth
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
  const existingAuthUser = authUsers?.find(u => u.email === testEmail)

  let userId: string

  if (existingAuthUser) {
    userId = existingAuthUser.id
    console.log('Using existing auth user:', testEmail, '(', userId, ')')

    // Update password in case it changed
    await supabase.auth.admin.updateUserById(userId, {
      password: testPassword,
      email_confirm: true
    })
  } else {
    // Create new auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: { name: 'Admin User' }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      process.exit(1)
    }

    userId = authData.user.id
    console.log('Created auth user:', testEmail, '(', userId, ')')
  }

  // ============================================
  // Step 3: Create user profile in users table
  // ============================================
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    // Update existing profile
    await supabase
      .from('users')
      .update({
        name: 'Admin User',
        role: 'ADMIN',
        company_id: companyId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    console.log('Updated user profile')
  } else {
    // Create new profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId, // Must match Supabase Auth user ID
        email: testEmail,
        password_hash: 'supabase-managed',
        name: 'Admin User',
        role: 'ADMIN',
        company_id: companyId,
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      process.exit(1)
    }

    console.log('Created user profile')
  }

  // ============================================
  // Step 4: Create sample data
  // ============================================
  console.log('\nCreating sample data...')

  // Sample customers
  const customerNames = [
    { name: 'Ethiopian Airlines', email: 'contact@ethiopianairlines.com', phone: '+251111234567' },
    { name: 'Commercial Bank of Ethiopia', email: 'info@cbe.com.et', phone: '+251112234567' },
    { name: 'Ethio Telecom', email: 'support@ethiotelecom.et', phone: '+251114234567' },
    { name: 'Safari Coffee', email: 'orders@safaricoffee.com', phone: '+251115234567' },
    { name: 'Addis Pharmaceutical', email: 'sales@addispharma.com', phone: '+251116234567' },
  ]

  for (let i = 0; i < customerNames.length; i++) {
    const customer = customerNames[i]
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', customer.email)
      .single()

    if (!existing) {
      await supabase.from('customers').insert({
        id: randomUUID(),
        company_id: companyId,
        customer_number: `CUS-${String(i + 1).padStart(5, '0')}`,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        customer_type: 'CORPORATE',
        payment_terms: 'NET_30',
        is_active: true,
        billing_address: {
          street: `${i + 100} Business Street`,
          city: 'Addis Ababa',
          country: 'Ethiopia',
        },
      })
      console.log('  Created customer:', customer.name)
    }
  }

  // Sample vendors
  const vendorNames = [
    { name: 'ABC Supplies', email: 'orders@abcsupplies.com', phone: '+251117234567' },
    { name: 'Tech Solutions', email: 'sales@techsolutions.com', phone: '+251118234567' },
    { name: 'Office World', email: 'office@officeworld.com', phone: '+251119234567' },
  ]

  for (let i = 0; i < vendorNames.length; i++) {
    const vendor = vendorNames[i]
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', vendor.email)
      .single()

    if (!existing) {
      await supabase.from('vendors').insert({
        id: randomUUID(),
        company_id: companyId,
        vendor_number: `VND-${String(i + 1).padStart(5, '0')}`,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        vendor_type: 'SUPPLIER',
        payment_terms: 'NET_30',
        is_active: true,
      })
      console.log('  Created vendor:', vendor.name)
    }
  }

  // Sample bank account
  const { data: existingBank } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('company_id', companyId)
    .eq('account_name', 'Main Operating Account')
    .single()

  if (!existingBank) {
    await supabase.from('bank_accounts').insert({
      id: randomUUID(),
      company_id: companyId,
      account_name: 'Main Operating Account',
      account_number: '1000123456789',
      bank_name: 'Commercial Bank of Ethiopia',
      account_type: 'CHECKING',
      currency: 'ETB',
      opening_balance: 50000,
      current_balance: 50000,
      is_active: true,
    })
    console.log('  Created bank account: Main Operating Account')
  }

  // ============================================
  // Done!
  // ============================================
  console.log('\n==============================================')
  console.log('Database seeding completed!')
  console.log('==============================================')
  console.log('\nYou can now login with:')
  console.log('  Email: admin@sageflow.com')
  console.log('  Password: password123')
  console.log('\nNote: For development, you can also use demo mode:')
  console.log('  Email: demo@sageflow.app')
  console.log('  Password: demo123')
  console.log('==============================================\n')

  process.exit(0)
}

main().catch((e) => {
  console.error('Error seeding database:', e)
  process.exit(1)
})
