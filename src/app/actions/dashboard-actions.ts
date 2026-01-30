import { supabase } from "@/lib/supabase"
import type { ActionResult } from "@/types/api"

export async function getDashboardStats(companyId: string): Promise<ActionResult<{
  totalRevenue: number
  pendingInvoices: number
  activeCustomers: number
  totalExpenses: number
}>> {
  try {
    if (!companyId) {
      return { success: false, error: "Company ID is required" }
    }
    // Parallel queries
    const [invoices, expenses, customers] = await Promise.all([
      supabase.from('invoices').select('total').eq('company_id', companyId).eq('status', 'PAID'),
      supabase.from('invoices').select('total').eq('company_id', companyId).eq('status', 'SENT'), // Pending
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId)
    ])

    const totalRevenue = invoices.data?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0
    const pendingInvoices = expenses.data?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0

    return {
      success: true,
      data: {
        totalRevenue,
        pendingInvoices,
        activeCustomers: customers.count || 0,
        totalExpenses: 0, // Simplify for now
      }
    }
  } catch (error) {
    return { success: false, error: "Failed to fetch dashboard stats" }
  }
}

export async function getMonthlyRevenue(): Promise<ActionResult<any[]>> {
  // Simplified for prototype
  return { success: true, data: [] }
}

export async function getRecentInvoices(companyId: string): Promise<ActionResult<any[]>> {
  try {
    if (!companyId) {
      return { success: true, data: [] }
    }
    // Fetch invoices without nested customer (FK not configured in Supabase)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .limit(5)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Recent invoices error:', error)
      return { success: true, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error('Recent invoices error:', err)
    return { success: true, data: [] }
  }
}

export async function getPendingPayments(): Promise<ActionResult<any[]>> {
  return { success: true, data: [] }
}
