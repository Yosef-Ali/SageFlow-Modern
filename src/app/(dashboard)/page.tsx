'use client'

import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import {
  useDashboardStats,
  useMonthlyRevenue,
  useRecentInvoices,
  usePendingPayments,
} from '@/hooks/use-dashboard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { FileText, AlertTriangle, Plus, Users, Receipt } from 'lucide-react'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: revenueData, isLoading: revenueLoading } = useMonthlyRevenue()
  const { data: recentInvoices, isLoading: invoicesLoading } = useRecentInvoices()
  const { data: pendingPayments, isLoading: paymentsLoading } = usePendingPayments()

  const quickActions = [
    { name: 'New Invoice', href: '/invoices/new', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Add Customer', href: '/customers', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Record Payment', href: '/payments/new', icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Welcome back! Here's an overview of your business.</p>
        </div>
        <div className="flex items-center gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <div className={`p-1 rounded ${action.bg}`}>
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              {action.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Revenue Overview</h2>
            <p className="text-sm text-slate-500">Invoiced vs Received - Last 6 months</p>
          </div>
        </div>
        {revenueLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : revenueData && revenueData.length > 0 ? (
          <RevenueChart data={revenueData} />
        ) : (
          <div className="h-80 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No revenue data yet</p>
              <p className="text-sm text-slate-400">Create invoices to see your revenue trend</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Invoices</h2>
            <Link href="/invoices" className="text-sm text-emerald-600 hover:text-emerald-700">
              View all
            </Link>
          </div>
          {invoicesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentInvoices && recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-500">{invoice.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(invoice.total)}
                    </p>
                    <InvoiceStatusBadge status={invoice.status as any} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No invoices yet</p>
              <Link href="/invoices/new" className="text-sm text-emerald-600 hover:underline">
                Create your first invoice
              </Link>
            </div>
          )}
        </div>

        {/* Pending Payments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Overdue Payments</h2>
            <Link href="/invoices?status=OVERDUE" className="text-sm text-emerald-600 hover:text-emerald-700">
              View all
            </Link>
          </div>
          {paymentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingPayments && pendingPayments.length > 0 ? (
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/invoices/${payment.id}`}
                  className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{payment.customerName}</p>
                    <p className="text-sm text-red-600">
                      {payment.daysOverdue} days overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      {formatCurrency(payment.amountDue)}
                    </p>
                    <p className="text-xs text-slate-500">{payment.invoiceNumber}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No overdue payments</p>
              <p className="text-sm text-slate-400">Great job staying on top!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
