/**
 * Audit Actions - Centralized system for tracking changes
 */

import { supabase } from "@/lib/supabase"
import type { ActionResult } from "@/types/api"

export interface AuditLogEntry {
  company_id: string
  action: string
  entity_type: string
  entity_id: string
  details?: string
  user_id?: string
}

/**
 * Log an audit entry
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<ActionResult<void>> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        company_id: entry.company_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        details: entry.details,
        user_id: entry.user_id,
        timestamp: new Date().toISOString(),
      })

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Audit logging failed:', error)
    // We don't necessarily want to crash the app if auditing fails, 
    // but in a financial app, this might be a reason to abort.
    return { success: false, error: 'Failed to log audit' }
  }
}

/**
 * Get audit logs for a company
 */
export async function getAuditLogs(companyId: string, limit = 50): Promise<ActionResult<any[]>> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
