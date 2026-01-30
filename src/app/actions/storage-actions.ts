/**
 * Storage Actions - Manage file uploads to Supabase Storage
 */

import { supabase } from "@/lib/supabase"
import type { ActionResult } from "@/types/api"
import { verifyRole } from "./auth-helpers"

/**
 * Upload a company logo
 */
export async function uploadCompanyLogo(file: File): Promise<ActionResult<{ url: string }>> {
  try {
    const auth = await verifyRole(['ADMIN', 'MANAGER'])
    if (!auth.success) return { success: false, error: auth.error }

    const companyId = auth.companyId!
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `logos/${companyId}/${fileName}`

    // Upload to bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('company-assets')
      .getPublicUrl(filePath)

    // Update company profile with new logo URL
    const { error: dbError } = await supabase
      .from('companies')
      .update({
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)

    if (dbError) throw dbError

    return { success: true, data: { url: publicUrl } }
  } catch (error: any) {
    console.error('Logo upload failed:', error)
    return { success: false, error: error.message || 'Failed to upload logo' }
  }
}
