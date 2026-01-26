import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, CreditCard, DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardHeader } from '@/components/dashboard/header'
import { PaymentTable } from '@/components/payments/payment-table'
import { usePayments } from '@/hooks/use-payments'
import { formatCurrency } from '@/lib/utils'

export default function PaymentsPage() {
  const { data: payments, isLoading } = usePayments()
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!payments || payments.length === 0) {
      return { total: 0, thisMonth: 0, count: 0 }
    }

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let total = 0
    let thisMonth = 0

    payments.forEach((payment: any) => {
      const amount = Number(payment.amount) || 0
      total += amount

      const paymentDate = new Date(payment.paymentDate)
      if (paymentDate >= thisMonthStart) {
        thisMonth += amount
      }
    })

    return { total, thisMonth, count: payments.length }
  }, [payments])

  // Filter payments by search
  const filteredPayments = useMemo(() => {
    if (!payments) return []
    if (!searchQuery.trim()) return payments

    const query = searchQuery.toLowerCase()
    return payments.filter((payment: any) =>
      payment.customer?.name?.toLowerCase().includes(query) ||
      payment.reference?.toLowerCase().includes(query) ||
      payment.invoice?.invoiceNumber?.toLowerCase().includes(query)
    )
  }, [payments, searchQuery])

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Payments"
        text="Track customer payments and manage receivables"
      >
        <Link to="/dashboard/payments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </Link>
      </DashboardHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
            <p className="text-xs text-muted-foreground">{stats.count} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Average Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.count > 0 ? stats.total / stats.count : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by customer, reference, or invoice..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Payments Table */}
      {!isLoading && (
        <PaymentTable payments={filteredPayments} isLoading={isLoading} />
      )}
    </div>
  )
}
