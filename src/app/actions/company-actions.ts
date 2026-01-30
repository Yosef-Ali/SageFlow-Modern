/**
 * Company Actions - Manage company profile and logo
 */

import { supabase } from "@/lib/supabase"
import { logAuditAction } from "./audit-actions"
import { verifyRole } from "./auth-helpers"
import type { ActionResult } from "@/types/api"

export interface CompanyProfile {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  tax_id: string | null
  logo_url: string | null
  currency: string
  settings: any
}

/**
 * Get company profile
 */
export async function getCompanyProfile(companyId: string): Promise<ActionResult<CompanyProfile>> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error) throw error

    return { success: true, data: data as CompanyProfile }
  } catch (error: any) {
    console.error('Error fetching company profile:', error)
    return { success: false, error: error.message || 'Failed to fetch company profile' }
  }
}

/**
 * Update company profile
 */
export async function updateCompanyProfile(
  companyId: string,
  updates: Partial<Omit<CompanyProfile, 'id' | 'created_at'>>
): Promise<ActionResult<void>> {
  try {
    const auth = await verifyRole(['ADMIN'])
    if (!auth.success) return { success: false, error: auth.error }

    const { error } = await supabase
      .from('companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)

    if (error) throw error

    // Log the update
    await logAuditAction({
      company_id: auth.companyId!,
      user_id: auth.userId,
      action: 'UPDATE_PROFILE',
      entity_type: 'COMPANY',
      entity_id: companyId,
      details: JSON.stringify(updates),
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error updating company profile:', error)
    return { success: false, error: error.message || 'Failed to update company profile' }
  }
}

/**
 * Update company logo URL
 */
export async function updateCompanyLogo(companyId: string, logoUrl: string): Promise<ActionResult<void>> {
  try {
    const auth = await verifyRole(['ADMIN'])
    if (!auth.success) return { success: false, error: auth.error }

    const { error } = await supabase
      .from('companies')
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)

    if (error) throw error

    // Log the logo update
    await logAuditAction({
      company_id: auth.companyId!,
      user_id: auth.userId,
      action: 'UPDATE_LOGO',
      entity_type: 'COMPANY',
      entity_id: companyId,
      details: `Updated logo URL: ${logoUrl}`,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error updating company logo:', error)
    return { success: false, error: error.message || 'Failed to update company logo' }
  }
}
