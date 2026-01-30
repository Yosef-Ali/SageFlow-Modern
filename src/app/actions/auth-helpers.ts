/**
 * Auth Helpers - Server-side permission checks
 */

import { supabase } from "@/lib/supabase"

/**
 * Verify if the current session user has a specific role or higher
 */
export async function verifyRole(allowedRoles: string[]): Promise<{ success: boolean; companyId?: string; userId?: string; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: No active session' }
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (dbError || !userData) {
      return { success: false, error: 'Unauthorized: User profile not found' }
    }

    if (!allowedRoles.includes(userData.role)) {
      return { success: false, error: `Unauthorized: Required roles: ${allowedRoles.join(', ')}` }
    }

    return {
      success: true,
      companyId: userData.company_id,
      userId: user.id
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Verification failed' }
  }
}
