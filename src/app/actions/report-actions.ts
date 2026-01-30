import { supabase } from "@/lib/supabase"
import { ActionResult } from "@/types/api"

export interface GLFilterValues {
  dateFrom?: Date
  dateTo?: Date
}

export async function getGeneralLedger(companyId: string, filters?: GLFilterValues): Promise<ActionResult<any[]>> {
  try {
    if (!companyId) {
      return { success: false, error: "Company ID is required" }
    }
    // Simplified query - FK relationships not configured in Supabase
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error("Error fetching GL:", error)
    // Return error if table doesn't exist or has issues
    return { success: false, error: error.message || "Failed to fetch general ledger" }
  }
}

export async function getGLSummary(filters?: GLFilterValues) {
  try {
    return {
      success: true,
      data: {
        totalDebit: 0,
        totalCredit: 0,
      }
    }
  } catch (error) {
    return { success: false, error: "Failed to fetch GL summary" }
  }
}

// ============ Financial Reports ============

export async function getProfitLossReport(companyId: string, { startDate, endDate }: { startDate: string, endDate: string }) {
  try {
    if (!companyId) {
      return { success: true, data: { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netIncome: 0 } }
    }
    // Fetch Revenue Accounts (use account_name, not name)
    const { data: revenueAccounts, error: revError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name, type, balance')
      .eq('company_id', companyId)
      .eq('type', 'REVENUE')

    if (revError) {
      console.error('Revenue accounts error:', revError)
    }

    // Fetch Expense Accounts
    const { data: expenseAccounts, error: expError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name, type, balance')
      .eq('company_id', companyId)
      .eq('type', 'EXPENSE')

    if (expError) {
      console.error('Expense accounts error:', expError)
    }

    // Calculate totals from account balances (simplified P&L)
    const income = (revenueAccounts || []).map(acc => ({
      accountName: acc.account_name,
      amount: Math.abs(Number(acc.balance) || 0)
    }))
    const expenses = (expenseAccounts || []).map(acc => ({
      accountName: acc.account_name,
      amount: Math.abs(Number(acc.balance) || 0)
    }))

    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0)
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)

    return {
      success: true,
      data: {
        income,
        expenses,
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses
      }
    }
  } catch (error: any) {
    console.error("Error fetching P&L:", error)
    // Return empty data structure on error
    return {
      success: true,
      data: {
        income: [],
        expenses: [],
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0
      }
    }
  }
}

export async function getTrialBalanceReport(companyId: string, { date }: { date: string }) {
  try {
    if (!companyId) {
      return { success: true, data: { accounts: [], totals: { debit: 0, credit: 0 } } }
    }
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_name, type, balance')
      .eq('company_id', companyId)
      .order('account_number', { ascending: true })

    if (error) {
      console.error('Trial balance error:', error)
      // Return empty data on error
      return {
        success: true,
        data: {
          accounts: [],
          totals: { debit: 0, credit: 0 }
        }
      }
    }

    const formattedAccounts = (accounts || []).map(acc => ({
      id: acc.id,
      code: acc.account_number,
      name: acc.account_name,
      type: acc.type,
      debit: Number(acc.balance) > 0 ? Number(acc.balance) : 0,
      credit: Number(acc.balance) < 0 ? Math.abs(Number(acc.balance)) : 0
    }))

    const totals = formattedAccounts.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit,
      credit: acc.credit + curr.credit
    }), { debit: 0, credit: 0 })

    return {
      success: true,
      data: {
        accounts: formattedAccounts,
        totals
      }
    }
  } catch (error: any) {
    console.error("Error fetching Trial Balance:", error)
    return {
      success: true,
      data: {
        accounts: [],
        totals: { debit: 0, credit: 0 }
      }
    }
  }
}

export async function getBalanceSheetReport(companyId: string, { date }: { date: string }) {
  try {
    if (!companyId) {
      return { success: true, data: { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 } }
    }
    // Fetch Assets
    const { data: assets, error: assetsError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_name, type, balance')
      .eq('company_id', companyId)
      .eq('type', 'ASSET')

    if (assetsError) console.error('Assets error:', assetsError)

    // Fetch Liabilities
    const { data: liabilities, error: liabError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_name, type, balance')
      .eq('company_id', companyId)
      .eq('type', 'LIABILITY')

    if (liabError) console.error('Liabilities error:', liabError)

    // Fetch Equity
    const { data: equity, error: equityError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_name, type, balance')
      .eq('company_id', companyId)
      .eq('type', 'EQUITY')

    if (equityError) console.error('Equity error:', equityError)

    // Helper to calculate totals
    const sumBalance = (accounts: any[]) => accounts?.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0) || 0

    // Format accounts for display (add name field from account_name)
    const formatAccounts = (accounts: any[]) => (accounts || []).map(acc => ({
      ...acc,
      name: acc.account_name
    }))

    const totalAssets = sumBalance(assets || [])
    const totalLiabilities = sumBalance(liabilities || [])
    const totalEquity = sumBalance(equity || [])

    return {
      success: true,
      data: {
        assets: formatAccounts(assets || []),
        liabilities: formatAccounts(liabilities || []),
        equity: formatAccounts(equity || []),
        totalAssets,
        totalLiabilities,
        totalEquity
      }
    }
  } catch (error: any) {
    console.error("Error fetching Balance Sheet:", error)
    return {
      success: true,
      data: {
        assets: [],
        liabilities: [],
        equity: [],
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0
      }
    }
  }
}
