/**
 * User Actions - Manage company users and roles
 */

import { supabase } from "@/lib/supabase"
import { logAuditAction } from "./audit-actions"
import { verifyRole } from "./auth-helpers"
import type { ActionResult } from "@/types/api"

export interface CompanyUser {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'ACCOUNTANT' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER'
  company_id: string
  created_at: string
}

/**
 * Get all users for a company
 */
export async function getCompanyUsers(companyId: string): Promise<ActionResult<CompanyUser[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data as CompanyUser[] }
  } catch (error: any) {
    console.error('Error fetching company users:', error)
    return { success: false, error: error.message || 'Failed to fetch users' }
  }
}

/**
 * Update a user's role
 */
export async function updateUserRole(userId: string, role: string): Promise<ActionResult<void>> {
  try {
    const auth = await verifyRole(['ADMIN'])
    if (!auth.success) return { success: false, error: auth.error }

    const { error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error

    // Log the change
    await logAuditAction({
      company_id: auth.companyId!,
      user_id: auth.userId,
      action: 'UPDATE_ROLE',
      entity_type: 'USER',
      entity_id: userId,
      details: `Changed role to ${role}`,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error updating user role:', error)
    return { success: false, error: error.message || 'Failed to update user role' }
  }
}

/**
 * Invite/Create a new user for the company
 * Note: In a real app, this would send an invitation email.
 * For now, we'll just add them to the users table.
 */
export async function inviteUser(userData: {
  email: string
  name: string
  role: string
  companyId: string
}): Promise<ActionResult<void>> {
  try {
    const auth = await verifyRole(['ADMIN', 'MANAGER'])
    if (!auth.success) return { success: false, error: auth.error }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' }
    }

    const { error } = await supabase
      .from('users')
      .insert({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        company_id: userData.companyId,
        password_hash: 'placeholder-needs-reset', // In real app, they'd set this via invite link
      })

    if (error) throw error

    // Log the invitation
    await logAuditAction({
      company_id: auth.companyId!,
      user_id: auth.userId,
      action: 'INVITE_USER',
      entity_type: 'USER',
      entity_id: userData.email,
      details: `Invited user ${userData.name} with role ${userData.role}`,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error inviting user:', error)
    return { success: false, error: error.message || 'Failed to invite user' }
  }
}

/**
 * Delete a user from the company
 */
export async function deleteUser(userId: string): Promise<ActionResult<void>> {
  try {
    const auth = await verifyRole(['ADMIN'])
    if (!auth.success) return { success: false, error: auth.error }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) throw error

    // Log the deletion
    await logAuditAction({
      company_id: auth.companyId!,
      user_id: auth.userId,
      action: 'DELETE_USER',
      entity_type: 'USER',
      entity_id: userId,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return { success: false, error: error.message || 'Failed to delete user' }
  }
}
