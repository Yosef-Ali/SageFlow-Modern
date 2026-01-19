'use server'

import { db } from '@/db'
import { invoices, customers, payments } from '@/db/schema'
import { eq, and, notInArray, inArray, gte, lte, lt, count, sum, desc } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export interface DashboardStats {
  totalRevenue: number
  totalCustomers: number
  invoicesSent: number
  pendingPayments: number
  revenueChange: number
  customerChange: number
  invoiceChange: number
  paymentChange: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  payments: number
}

export interface RecentInvoice {
  id: string
  invoiceNumber: string
  customerName: string
  total: number
  status: string
  date: Date
}

export interface PendingPayment {
  id: string
  invoiceNumber: string
  customerName: string
  amountDue: number
  daysOverdue: number
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Get total revenue (sum of all paid invoice totals)
    const [revenueResult] = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.status, 'PAID')))

    // Get total customers count
    const [customerCount] = await db
      .select({ count: count() })
      .from(customers)
      .where(and(eq(customers.companyId, companyId), eq(customers.isActive, true)))

    // Get invoices sent this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [invoiceCount] = await db
      .select({ count: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          notInArray(invoices.status, ['DRAFT', 'CANCELLED']),
          gte(invoices.createdAt, startOfMonth)
        )
      )

    // Get pending payments (unpaid invoices)
    const [pendingTotalResult] = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          inArray(invoices.status, ['SENT', 'PARTIALLY_PAID', 'OVERDUE'])
        )
      )

    const [paidAmountResult] = await db
      .select({ total: sum(invoices.paidAmount) })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          inArray(invoices.status, ['SENT', 'PARTIALLY_PAID', 'OVERDUE'])
        )
      )

    const pendingTotal = (Number(pendingTotalResult?.total) || 0) - (Number(paidAmountResult?.total) || 0)

    return {
      success: true,
      data: {
        totalRevenue: Number(revenueResult?.total) || 0,
        totalCustomers: customerCount.count,
        invoicesSent: invoiceCount.count,
        pendingPayments: pendingTotal,
        revenueChange: 12.5, // Would calculate from previous period
        customerChange: 8.2,
        invoiceChange: 15.3,
        paymentChange: -5.2,
      },
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stats',
    }
  }
}

/**
 * Get monthly revenue for chart
 */
export async function getMonthlyRevenue(): Promise<ActionResult<MonthlyRevenue[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const months: MonthlyRevenue[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' })

      // Get revenue (invoices created in this month)
      const [invoiceResult] = await db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            gte(invoices.date, monthStart),
            lte(invoices.date, monthEnd),
            notInArray(invoices.status, ['CANCELLED'])
          )
        )

      // Get payments received in this month
      const [paymentResult] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(
            eq(payments.companyId, companyId),
            gte(payments.paymentDate, monthStart),
            lte(payments.paymentDate, monthEnd)
          )
        )

      months.push({
        month: monthName,
        revenue: Number(invoiceResult?.total) || 0,
        payments: Number(paymentResult?.total) || 0,
      })
    }

    return { success: true, data: months }
  } catch (error) {
    console.error('Error fetching monthly revenue:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch revenue data',
    }
  }
}

/**
 * Get recent invoices
 */
export async function getRecentInvoices(): Promise<ActionResult<RecentInvoice[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const recentInvoices = await db.query.invoices.findMany({
      where: eq(invoices.companyId, companyId),
      orderBy: desc(invoices.createdAt),
      limit: 5,
      with: {
        customer: {
          columns: { name: true },
        },
      },
    })

    return {
      success: true,
      data: recentInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        total: Number(inv.total),
        status: inv.status,
        date: inv.date,
      })),
    }
  } catch (error) {
    console.error('Error fetching recent invoices:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices',
    }
  }
}

/**
 * Get pending payments (overdue invoices)
 */
export async function getPendingPayments(): Promise<ActionResult<PendingPayment[]>> {
  try {
    const companyId = await getCurrentCompanyId()
    const today = new Date()

    const overdueInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.companyId, companyId),
        inArray(invoices.status, ['SENT', 'PARTIALLY_PAID', 'OVERDUE']),
        lt(invoices.dueDate, today)
      ),
      orderBy: invoices.dueDate,
      limit: 5,
      with: {
        customer: {
          columns: { name: true },
        },
      },
    })

    return {
      success: true,
      data: overdueInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        amountDue: Number(inv.total) - Number(inv.paidAmount),
        daysOverdue: Math.floor((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    }
  } catch (error) {
    console.error('Error fetching pending payments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payments',
    }
  }
}
