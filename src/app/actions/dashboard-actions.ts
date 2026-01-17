'use server'

import { prisma } from '@/lib/prisma'
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

    // Get total revenue (sum of all paid amounts)
    const revenueResult = await prisma.invoice.aggregate({
      where: { companyId, status: 'PAID' },
      _sum: { total: true },
    })

    // Get total customers count
    const totalCustomers = await prisma.customer.count({
      where: { companyId, isActive: true },
    })

    // Get invoices sent this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const invoicesSent = await prisma.invoice.count({
      where: {
        companyId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        createdAt: { gte: startOfMonth },
      },
    })

    // Get pending payments (unpaid invoices)
    const pendingResult = await prisma.invoice.aggregate({
      where: {
        companyId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      _sum: { total: true },
    })

    const paidResult = await prisma.invoice.aggregate({
      where: {
        companyId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      _sum: { paidAmount: true },
    })

    const pendingTotal = (pendingResult._sum.total?.toNumber() || 0) - (paidResult._sum.paidAmount?.toNumber() || 0)

    return {
      success: true,
      data: {
        totalRevenue: revenueResult._sum.total?.toNumber() || 0,
        totalCustomers,
        invoicesSent,
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
      const invoiceResult = await prisma.invoice.aggregate({
        where: {
          companyId,
          date: { gte: monthStart, lte: monthEnd },
          status: { notIn: ['CANCELLED'] },
        },
        _sum: { total: true },
      })

      // Get payments received in this month
      const paymentResult = await prisma.payment.aggregate({
        where: {
          companyId,
          paymentDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      })

      months.push({
        month: monthName,
        revenue: invoiceResult._sum.total?.toNumber() || 0,
        payments: paymentResult._sum.amount?.toNumber() || 0,
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

    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: { select: { name: true } },
      },
    })

    return {
      success: true,
      data: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        total: inv.total.toNumber(),
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

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { lt: today },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: {
        customer: { select: { name: true } },
      },
    })

    return {
      success: true,
      data: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.name,
        amountDue: inv.total.toNumber() - inv.paidAmount.toNumber(),
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
