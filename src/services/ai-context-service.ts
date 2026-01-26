/**
 * AI Context Service - Fetches business data from Supabase for AI assistant
 */

import { supabase } from "@/lib/supabase"

export interface BusinessContext {
  summary: {
    totalRevenue: number
    totalExpenses: number
    pendingInvoices: number
    overdueInvoices: number
    activeCustomers: number
    activeVendors: number
    lowStockItems: number
  }
  recentInvoices: Array<{
    invoiceNumber: string
    customerName: string
    total: number
    status: string
    dueDate: string
  }>
  recentPayments: Array<{
    amount: number
    date: string
    method: string
    reference: string
  }>
  topCustomers: Array<{
    name: string
    totalPurchases: number
  }>
  overdueInvoices: Array<{
    invoiceNumber: string
    customerName: string
    total: number
    dueDate: string
    daysOverdue: number
  }>
  inventoryAlerts: Array<{
    itemName: string
    currentStock: number
    reorderPoint: number
  }>
  cashFlow: {
    inflow: number
    outflow: number
    net: number
  }
}

/**
 * Fetch comprehensive business context for AI
 */
export async function getBusinessContext(): Promise<BusinessContext> {
  try {
    // Parallel queries for efficiency
    const [
      invoicesResult,
      paymentsResult,
      customersResult,
      vendorsResult,
      inventoryResult
    ] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }).limit(20),
      supabase.from('customers').select('*'),
      supabase.from('vendors').select('*'),
      supabase.from('items').select('*')
    ])

    const invoices = invoicesResult.data || []
    const payments = paymentsResult.data || []
    const customers = customersResult.data || []
    const vendors = vendorsResult.data || []
    const items = inventoryResult.data || []

    // Calculate summary stats
    const paidInvoices = invoices.filter(i => i.status === 'PAID')
    const pendingInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT')
    const overdueInvoices = invoices.filter(i => {
      if (i.status === 'PAID') return false
      const dueDate = new Date(i.due_date)
      return dueDate < new Date()
    })

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
    const totalPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // Low stock items
    const lowStockItems = items.filter(item => {
      const qty = Number(item.quantity_on_hand) || 0
      const reorder = Number(item.reorder_point) || 0
      return qty <= reorder && reorder > 0
    })

    // Customer name lookup
    const customerMap = new Map(customers.map(c => [c.id, c.name || c.company_name || 'Unknown']))

    // Top customers by revenue
    const customerRevenue = new Map<string, number>()
    invoices.filter(i => i.status === 'PAID').forEach(inv => {
      const current = customerRevenue.get(inv.customer_id) || 0
      customerRevenue.set(inv.customer_id, current + (Number(inv.total) || 0))
    })
    const topCustomers = Array.from(customerRevenue.entries())
      .map(([id, total]) => ({ name: customerMap.get(id) || 'Unknown', totalPurchases: total }))
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 5)

    // Recent invoices with customer names
    const recentInvoices = invoices.slice(0, 10).map(inv => ({
      invoiceNumber: inv.invoice_number || `INV-${inv.id?.slice(0, 8)}`,
      customerName: customerMap.get(inv.customer_id) || 'Unknown',
      total: Number(inv.total) || 0,
      status: inv.status || 'DRAFT',
      dueDate: inv.due_date || ''
    }))

    // Overdue invoices with days overdue
    const overdueList = overdueInvoices.map(inv => {
      const dueDate = new Date(inv.due_date)
      const today = new Date()
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        invoiceNumber: inv.invoice_number || `INV-${inv.id?.slice(0, 8)}`,
        customerName: customerMap.get(inv.customer_id) || 'Unknown',
        total: Number(inv.total) || 0,
        dueDate: inv.due_date || '',
        daysOverdue
      }
    }).sort((a, b) => b.daysOverdue - a.daysOverdue)

    // Recent payments
    const recentPayments = payments.slice(0, 10).map(p => ({
      amount: Number(p.amount) || 0,
      date: p.payment_date || '',
      method: p.payment_method || 'unknown',
      reference: p.reference || ''
    }))

    // Inventory alerts
    const inventoryAlerts = lowStockItems.map(item => ({
      itemName: item.name || 'Unknown Item',
      currentStock: Number(item.quantity_on_hand) || 0,
      reorderPoint: Number(item.reorder_point) || 0
    }))

    return {
      summary: {
        totalRevenue,
        totalExpenses: 0, // Would need bills/expenses table
        pendingInvoices: pendingInvoices.length,
        overdueInvoices: overdueInvoices.length,
        activeCustomers: customers.length,
        activeVendors: vendors.length,
        lowStockItems: lowStockItems.length
      },
      recentInvoices,
      recentPayments,
      topCustomers,
      overdueInvoices: overdueList.slice(0, 5),
      inventoryAlerts: inventoryAlerts.slice(0, 5),
      cashFlow: {
        inflow: totalPayments,
        outflow: 0,
        net: totalPayments
      }
    }
  } catch (error) {
    console.error('Error fetching business context:', error)
    // Return empty context on error
    return {
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        activeCustomers: 0,
        activeVendors: 0,
        lowStockItems: 0
      },
      recentInvoices: [],
      recentPayments: [],
      topCustomers: [],
      overdueInvoices: [],
      inventoryAlerts: [],
      cashFlow: { inflow: 0, outflow: 0, net: 0 }
    }
  }
}

/**
 * Format business context as text for AI prompt
 */
export function formatContextForAI(context: BusinessContext): string {
  return `
## CURRENT BUSINESS DATA (from Supabase)

### Financial Summary
- Total Revenue: ETB ${context.summary.totalRevenue.toLocaleString()}
- Pending Invoices: ${context.summary.pendingInvoices}
- Overdue Invoices: ${context.summary.overdueInvoices}
- Active Customers: ${context.summary.activeCustomers}
- Active Vendors: ${context.summary.activeVendors}
- Low Stock Items: ${context.summary.lowStockItems}

### Cash Flow
- Inflow: ETB ${context.cashFlow.inflow.toLocaleString()}
- Outflow: ETB ${context.cashFlow.outflow.toLocaleString()}
- Net: ETB ${context.cashFlow.net.toLocaleString()}

### Top Customers
${context.topCustomers.map(c => `- ${c.name}: ETB ${c.totalPurchases.toLocaleString()}`).join('\n') || 'No data'}

### Recent Invoices
${context.recentInvoices.map(i => `- ${i.invoiceNumber} | ${i.customerName} | ETB ${i.total.toLocaleString()} | ${i.status}`).join('\n') || 'No invoices'}

### Overdue Invoices (NEEDS ATTENTION)
${context.overdueInvoices.map(i => `- ${i.invoiceNumber} | ${i.customerName} | ETB ${i.total.toLocaleString()} | ${i.daysOverdue} days overdue`).join('\n') || 'No overdue invoices'}

### Recent Payments
${context.recentPayments.map(p => `- ETB ${p.amount.toLocaleString()} | ${p.date} | ${p.method}`).join('\n') || 'No payments'}

### Inventory Alerts
${context.inventoryAlerts.map(i => `- ${i.itemName}: ${i.currentStock} in stock (reorder at ${i.reorderPoint})`).join('\n') || 'No alerts'}
`
}
