
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
// IMPORTANT: hooks need to be mock-compatible or API-compatible, currently pointing to server actions
// We'll stub them for now to allow UI rendering
import { formatCurrency } from '@/lib/utils'
import { FileText, AlertTriangle, Plus, Users, Receipt } from 'lucide-react'

// MOCK DATA for migration purposes
const MOCK_STATS = {
    totalRevenue: 125000,
    outstandingInvoices: 45000,
    activeCustomers: 12,
    totalExpenses: 32000,
    // Add missing fields to satisfy StatsCardsProps
    totalCustomers: 45,
    invoicesSent: 28,
    pendingPayments: 5,
    revenueChange: 12.5,
    customerChange: 5,
    invoiceChange: -2,
    paymentChange: 0
}

const MOCK_REVENUE = [
    { month: 'Jan', revenue: 12000, payments: 10000 },
    { month: 'Feb', revenue: 18000, payments: 15000 },
    { month: 'Mar', revenue: 22000, payments: 20000 },
    { month: 'Apr', revenue: 25000, payments: 22000 },
    { month: 'May', revenue: 28000, payments: 26000 },
    { month: 'Jun', revenue: 32000, payments: 28000 },
]

export default function DashboardPage() {
  // TODO: Replace with real hooks connected to client-side API
  const statsLoading = false
  const revenueLoading = false
  const invoicesLoading = false
  const paymentsLoading = false
  
  const recentInvoices: any[] = [
    { id: '1', invoiceNumber: 'INV-00125', customerName: 'Zemen Bank', total: 45000, status: 'PAID' },
    { id: '2', invoiceNumber: 'INV-00126', customerName: 'Abyssinia Corp', total: 12500, status: 'SENT' },
    { id: '3', invoiceNumber: 'INV-00127', customerName: 'Ethio Telecom', total: 8500, status: 'OVERDUE' },
  ]

  const pendingPayments: any[] = [
    { id: '3', invoiceNumber: 'INV-00127', customerName: 'Ethio Telecom', amountDue: 8500, daysOverdue: 12 },
    { id: '4', invoiceNumber: 'INV-00122', customerName: 'Lucy Trading', amountDue: 15200, daysOverdue: 5 },
  ]

  const quickActions = [
    { name: 'New Invoice', href: '/dashboard/invoices/new', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { name: 'Add Customer', href: '/dashboard/customers', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Record Payment', href: '/dashboard/payments/new', icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back! Here's an overview of your business.</p>
        </div>
        <div className="flex items-center gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-[13px] font-medium text-foreground hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm transition-all shadow-elegant"
            >
              <div className={`p-0.5 rounded ${action.bg}`}>
                <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
              </div>
              <span className="hidden sm:inline">{action.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={MOCK_STATS} isLoading={statsLoading} />

      {/* Revenue Chart */}
      <div className="bg-card p-5 rounded-xl shadow-elegant-lg border border-border/60">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Revenue Overview</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">Invoiced vs Received - Last 6 months</p>
          </div>
        </div>
        {revenueLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : MOCK_REVENUE.length > 0 ? (
          <RevenueChart data={MOCK_REVENUE} />
        ) : (
          <div className="h-72 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No revenue data yet</p>
              <p className="text-[13px] text-muted-foreground/70">Create invoices to see your revenue trend</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Recent Invoices */}
        <div className="bg-card p-5 rounded-xl shadow-elegant-lg border border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground tracking-tight">Recent Invoices</h2>
            <Link to="/dashboard/invoices" className="text-[13px] text-primary hover:text-primary/80 font-medium transition-colors">
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
                  to={`/dashboard/invoices/${invoice.id}`}
                  className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(invoice.total)}
                    </p>
                    {/* Status badge commented out for now to simplify migration */}
                    {/* <InvoiceStatusBadge status={invoice.status as any} /> */}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <FileText className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No invoices yet</p>
              <Link to="/dashboard/invoices/new" className="text-[13px] text-primary hover:underline font-medium">
                Create your first invoice
              </Link>
            </div>
          )}
        </div>

        {/* Pending Payments */}
        <div className="bg-card p-5 rounded-xl shadow-elegant-lg border border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground tracking-tight">Overdue Payments</h2>
            <Link to="/dashboard/invoices?status=OVERDUE" className="text-[13px] text-primary hover:text-primary/80 font-medium transition-colors">
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
                  to={`/dashboard/invoices/${payment.id}`}
                  className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{payment.customerName}</p>
                    <p className="text-sm text-destructive">
                      {payment.daysOverdue} days overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">
                      {formatCurrency(payment.amountDue)}
                    </p>
                    <p className="text-xs text-muted-foreground">{payment.invoiceNumber}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertTriangle className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No overdue payments</p>
              <p className="text-[13px] text-muted-foreground/60">Great job staying on top!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
