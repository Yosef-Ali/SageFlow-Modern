import { supabase } from "@/lib/supabase"
import { VendorFormValues } from "@/lib/validations/vendor"
import { formatSupabaseError } from "@/lib/error-utils"
import type { ActionResult } from "@/types/api"
import type { Vendor } from "@/db/schema"

export type { VendorFormValues }

/**
 * Helper to map database snake_case to application camelCase
 */
function mapVendorResponse(data: any): Vendor {
  return {
    ...data,
    companyId: data.company_id,
    vendorNumber: data.vendor_number,
    // name, email, phone, notes are same
    taxId: data.tax_id,
    paymentTerms: data.payment_terms,
    vendorType: data.vendor_type,
    contactName: data.contact_name,
    discountPercent: data.discount_percent,
    creditLimit: data.credit_limit,
    taxExempt: data.tax_exempt,
    taxExemptNumber: data.tax_exempt_number,
    openingBalance: data.opening_balance,
    openingBalanceDate: data.opening_balance_date ? new Date(data.opening_balance_date) : null,
    vendorSince: data.vendor_since ? new Date(data.vendor_since) : null,
    isActive: data.is_active,
    createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    // Map address since it's JSON
    address: data.address
  } as Vendor
}

/**
 * Generate next vendor number for a company
 */
async function generateVendorNumber(companyId: string): Promise<string> {
  const { count } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const nextNum = (count || 0) + 1
  return `VND-${String(nextNum).padStart(5, '0')}`
}

/**
 * Get vendors with optional filters
 */
export async function getVendors(
  companyId: string,
  filters?: { search?: string; status?: string; vendorType?: string }
): Promise<ActionResult<Vendor[]>> {
  try {
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,vendor_number.ilike.%${filters.search}%`)
    }

    if (filters?.status === 'active') {
      query = query.eq('is_active', true)
    } else if (filters?.status === 'inactive') {
      query = query.eq('is_active', false)
    }

    if (filters?.vendorType) {
      query = query.eq('vendor_type', filters.vendorType)
    }

    const { data, error } = await query

    if (error) throw error

    // Map all vendors
    const vendors = (data || []).map(mapVendorResponse)

    return { success: true, data: vendors }
  } catch (error) {
    console.error("Error fetching vendors:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get single vendor by ID
 */
export async function getVendor(id: string): Promise<ActionResult<Vendor>> {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return { success: true, data: mapVendorResponse(data) }
  } catch (error) {
    console.error("Error fetching vendor:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Create a new vendor
 */
export async function createVendor(
  companyId: string,
  data: VendorFormValues
): Promise<ActionResult<Vendor>> {
  try {
    const vendorNumber = await generateVendorNumber(companyId)

    const { data: newVendor, error } = await supabase
      .from('vendors')
      .insert({
        company_id: companyId,
        vendor_number: vendorNumber,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tax_id: data.taxId,
        payment_terms: data.paymentTerms || 'NET_30',
        balance: data.balance || 0,
        vendor_type: data.vendorType || 'SUPPLIER',
        contact_name: data.contactName,
        discount_percent: data.discountPercent,
        credit_limit: data.creditLimit,
        tax_exempt: data.taxExempt || false,
        tax_exempt_number: data.taxExemptNumber,
        opening_balance: data.openingBalance,
        opening_balance_date: data.openingBalanceDate,
        vendor_since: data.vendorSince || new Date(),
        notes: data.notes,
        is_active: data.isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data: mapVendorResponse(newVendor) }
  } catch (error) {
    console.error("Error creating vendor:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Update an existing vendor
 */
export async function updateVendor(
  id: string,
  data: VendorFormValues
): Promise<ActionResult<Vendor>> {
  try {
    const { data: updated, error } = await supabase
      .from('vendors')
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tax_id: data.taxId,
        payment_terms: data.paymentTerms,
        vendor_type: data.vendorType,
        contact_name: data.contactName,
        discount_percent: data.discountPercent,
        credit_limit: data.creditLimit,
        tax_exempt: data.taxExempt,
        tax_exempt_number: data.taxExemptNumber,
        notes: data.notes,
        is_active: data.isActive,
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: mapVendorResponse(updated) }
  } catch (error) {
    console.error("Error updating vendor:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Soft delete a vendor
 */
export async function deleteVendor(id: string): Promise<ActionResult<void>> {
  try {
    const { error } = await supabase
      .from('vendors')
      .update({ is_active: false, updated_at: new Date() })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Restore a soft-deleted vendor
 */
export async function restoreVendor(id: string): Promise<ActionResult<void>> {
  try {
    const { error } = await supabase
      .from('vendors')
      .update({ is_active: true, updated_at: new Date() })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get vendors for dropdown (active only)
 */
export async function getVendorsForDropdown(companyId: string): Promise<ActionResult<Array<{ id: string; name: string }>>> {
  try {
    const { data } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: formatSupabaseError(error) }
  }
}

/**
 * Get vendor summary stats
 */
export async function getVendorsSummary(companyId: string): Promise<ActionResult<{
  total: number
  active: number
  totalBalance: number
}>> {
  try {
    const [totalResult, activeResult, balanceResult] = await Promise.all([
      supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true),
      supabase
        .from('vendors')
        .select('balance')
        .eq('company_id', companyId),
    ])

    const totalBalance = balanceResult.data?.reduce(
      (sum, v) => sum + (Number(v.balance) || 0),
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
    console.error("Error fetching vendor summary:", error)
    return { success: false, error: formatSupabaseError(error) }
  }
}
