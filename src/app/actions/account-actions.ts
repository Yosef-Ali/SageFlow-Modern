import { supabase } from "@/lib/supabase"

// Account form values type
export interface AccountFormValues {
  accountNumber: string
  accountName: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  parentId?: string | null
  balance?: number
  isActive?: boolean
}

export async function getChartOfAccounts(companyId: string, filters?: { type?: string; search?: string }) {
  try {
    if (!companyId) {
      return { success: true, data: [] }
    }

    let query = supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('account_number', { ascending: true })

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }
    if (filters?.search) {
      query = query.ilike('account_name', `%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return { success: false, error: "Failed to fetch accounts" }
  }
}

export async function getAccount(id: string, companyId?: string) {
  try {
    let query = supabase.from('chart_of_accounts').select('*').eq('id', id)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query.single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: "Failed to fetch account" }
  }
}

export async function createAccount(data: AccountFormValues, companyId: string) {
  try {
    if (!companyId) {
      return { success: false, error: "Company ID is required" }
    }

    const { data: newAccount, error } = await supabase.from('chart_of_accounts').insert({
      company_id: companyId,
      account_number: data.accountNumber,
      account_name: data.accountName,
      type: data.type,
      parent_id: data.parentId,
      balance: data.balance || '0',
      is_active: data.isActive ?? true
    }).select().single()

    if (error) throw error
    return { success: true, data: newAccount }
  } catch (error: any) {
    console.error('Create account error:', error)
    return { success: false, error: error.message || "Failed to create account" }
  }
}

export async function updateAccount(id: string, data: AccountFormValues) {
  try {
    const { error } = await supabase.from('chart_of_accounts').update({
      account_number: data.accountNumber,
      account_name: data.accountName,
      type: data.type,
      parent_id: data.parentId,
      balance: data.balance,
    }).eq('id', id)

    if (error) throw error
    return { success: true, data: { id } }
  } catch (error) {
    return { success: false, error: "Failed to update account" }
  }
}

export async function deleteAccount(id: string) {
  try {
    const { error } = await supabase.from('chart_of_accounts').update({ is_active: false }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to delete account" }
  }
}

export async function getAccountsSummary(companyId: string) {
  try {
    if (!companyId) {
      return { success: true, data: { totalAccounts: 0 } }
    }

    const { count } = await supabase
      .from('chart_of_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    return {
      success: true,
      data: {
        totalAccounts: count || 0,
      }
    }
  } catch (error) {
    return { success: false, error: "Failed to fetch account summary" }
  }
}
