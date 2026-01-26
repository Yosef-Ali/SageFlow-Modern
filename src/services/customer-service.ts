import { supabase } from "@/lib/supabase"
import { CustomerFormValues, CustomerFiltersValues } from '@/lib/validations/customer'
import { formatSupabaseError } from '@/lib/error-utils'
import type { ActionResult } from '@/types/api'
import type { SerializedCustomer } from '@/types/customer'

/**
 * Generate next customer number for a company
 */
async function generateCustomerNumber(companyId: string, name?: string): Promise<string> {
  if (name) {
    // Peachtree style: First few letters of name + count
    const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .ilike('customer_number', `${prefix}%`)

    const suffix = String((count || 0) + 1).padStart(2, '0')
    return `${prefix}-${suffix}`
  }

  const { count } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const nextNum = (count || 0) + 1
  return `CUS-${String(nextNum).padStart(5, '0')}`
}

/**
 * Get customers with optional filters
 */
export async function getCustomers(
  companyId: string,
  filters?: Partial<CustomerFiltersValues>
): Promise<ActionResult<{ customers: SerializedCustomer[]; total: number }>> {
  try {
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)

    console.log(`[getCustomers] Fetching for Company: ${companyId}`)

    // Apply filters
    if (filters?.search) {
      const searchTerm = filters.search.trim()
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_number.ilike.%${searchTerm}%`)
      }
    }

    if (filters?.status === 'active') {
      query = query.eq('is_active', true)
    } else if (filters?.status === 'inactive') {
      query = query.eq('is_active', false)
    }

    if (filters?.customerType) {
      query = query.eq('customer_type', filters.customerType)
    }

    // Sorting
    if (filters?.sortBy) {
      // Map frontend sort keys to DB keys
      const sortMap: Record<string, string> = {
        name: 'name',
        customerNumber: 'customer_number',
        balance: 'balance',
        createdAt: 'created_at'
      }
      const dbSortKey = sortMap[filters.sortBy] || 'created_at'
      query = query.order(dbSortKey, { ascending: filters.sortOrder === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    query = query.range(start, end)

    const { data, count, error } = await query

    if (error) throw error

    // Map DB result (snake_case) to Frontend model (camelCase)
    const customers = (data || []).map(mapCustomerFromDb)

    console.log(`[getCustomers] Found ${customers.length} records. First ID: ${customers[0]?.id}`)

    return {
      success: true,
      data: {
        customers,
        total: count || 0
      }
    }
  } catch (error) {
    console.error("Error fetching customers:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

// Helper to map DB row to Customer type
function mapCustomerFromDb(row: any): SerializedCustomer {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    balance: Number(row.balance || 0),
    customerNumber: row.customer_number || 'UNKNOWN', // Fallback if missing
    billingAddress: row.billing_address || (row.address ? { street: row.address } : undefined), // Fallback for legacy schema
    shippingAddress: row.shipping_address,
    creditLimit: row.credit_limit,
    taxId: row.tax_id,
    isActive: row.is_active,
    customerType: row.customer_type,
    paymentTerms: row.payment_terms,
    contactName: row.contact_name,
    discountPercent: row.discount_percent,
    taxExempt: row.tax_exempt,
    taxExemptNumber: row.tax_exempt_number,
    priceLevel: row.price_level,
    salesRepId: row.sales_rep_id,
    openingBalance: row.opening_balance,
    openingBalanceDate: row.opening_balance_date,
    customerSince: row.customer_since,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * Get single customer by ID
 */
export async function getCustomer(id: string): Promise<ActionResult<SerializedCustomer>> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return { success: true, data: data as SerializedCustomer }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(
  companyId: string,
  data: CustomerFormValues
): Promise<ActionResult<SerializedCustomer>> {
  try {
    const customerNumber = await generateCustomerNumber(companyId, data.name)

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        customer_number: customerNumber,
        name: data.name,
        email: data.email,
        phone: data.phone,
        billing_address: data.billingAddress,
        shipping_address: data.shippingAddress,
        credit_limit: data.creditLimit,
        tax_id: data.taxId,
        notes: data.notes,
        is_active: data.isActive ?? true,
        customer_type: data.customerType || 'RETAIL',
        payment_terms: data.paymentTerms || 'NET_30',
        contact_name: data.contactName,
        discount_percent: data.discountPercent,
        tax_exempt: data.taxExempt || false,
        tax_exempt_number: data.taxExemptNumber,
        price_level: data.priceLevel || '1',
        sales_rep_id: data.salesRepId,
        opening_balance: data.openingBalance,
        opening_balance_date: data.openingBalanceDate,
        customer_since: data.customerSince || new Date(),
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: newCustomer as SerializedCustomer }
  } catch (error) {
    console.error("Error creating customer:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: string,
  data: CustomerFormValues
): Promise<ActionResult<SerializedCustomer>> {
  try {
    const { data: updated, error } = await supabase
      .from('customers')
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone,
        billing_address: data.billingAddress,
        shipping_address: data.shippingAddress,
        credit_limit: data.creditLimit,
        tax_id: data.taxId,
        notes: data.notes,
        is_active: data.isActive,
        customer_type: data.customerType,
        payment_terms: data.paymentTerms,
        contact_name: data.contactName,
        discount_percent: data.discountPercent,
        tax_exempt: data.taxExempt,
        tax_exempt_number: data.taxExemptNumber,
        price_level: data.priceLevel,
        sales_rep_id: data.salesRepId,
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: updated as SerializedCustomer }
  } catch (error) {
    console.error("Error updating customer:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Soft delete a customer
 */
export async function deleteCustomer(id: string): Promise<ActionResult<void>> {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: false, updated_at: new Date() })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Restore a soft-deleted customer
 */
export async function restoreCustomer(id: string): Promise<ActionResult<void>> {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: true, updated_at: new Date() })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get customer summary stats for a company
 */
export async function getCustomersSummary(companyId: string): Promise<ActionResult<{
  total: number
  active: number
  totalBalance: number
}>> {
  try {
    const [totalResult, activeResult, balanceResult] = await Promise.all([
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true),
      supabase
        .from('customers')
        .select('balance')
        .eq('company_id', companyId),
    ])

    const totalBalance = balanceResult.data?.reduce(
      (sum, c) => sum + (Number(c.balance) || 0),
      0
    ) || 0

    return {
      success: true,
      data: {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        totalBalance,
      }
    }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}
