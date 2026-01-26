
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
  
  const recentInvoices: any[] = [] // Empty for now
  const pendingPayments: any[] = [] // Empty for now

  const quickActions = [
    { name: 'New Invoice', href: '/dashboard/invoices/new', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { name: 'Add Customer', href: '/dashboard/customers', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Record Payment', href: '/dashboard/payments/new', icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your business.</p>
        </div>
        <div className="flex items-center gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 hover:border-muted-foreground/20 transition-all shadow-sm"
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
      <StatsCards stats={MOCK_STATS} isLoading={statsLoading} />

      {/* Revenue Chart */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Revenue Overview</h2>
            <p className="text-sm text-muted-foreground">Invoiced vs Received - Last 6 months</p>
          </div>
        </div>
        {revenueLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : MOCK_REVENUE.length > 0 ? (
          <RevenueChart data={MOCK_REVENUE} />
        ) : (
          <div className="h-80 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No revenue data yet</p>
              <p className="text-sm text-muted-foreground/80">Create invoices to see your revenue trend</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Invoices</h2>
            <Link to="/dashboard/invoices" className="text-sm text-primary hover:text-primary/80">
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
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No invoices yet</p>
              <Link to="/dashboard/invoices/new" className="text-sm text-primary hover:underline">
                Create your first invoice
              </Link>
            </div>
          )}
        </div>

        {/* Pending Payments */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Overdue Payments</h2>
            <Link to="/dashboard/invoices?status=OVERDUE" className="text-sm text-primary hover:text-primary/80">
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
              <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No overdue payments</p>
              <p className="text-sm text-muted-foreground/70">Great job staying on top!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
