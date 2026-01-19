'use client'

import { DollarSign, Users, FileText, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface StatsCardsProps {
  stats?: {
    totalRevenue: number
    totalCustomers: number
    invoicesSent: number
    pendingPayments: number
    revenueChange: number
    customerChange: number
    invoiceChange: number
    paymentChange: number
  }
  isLoading?: boolean
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `ETB ${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `ETB ${(value / 1000).toFixed(1)}K`
  }
  return `ETB ${value.toLocaleString()}`
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Revenue',
      value: stats ? formatCurrency(stats.totalRevenue) : 'ETB 0',
      change: stats?.revenueChange || 0,
      icon: DollarSign,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Active Customers',
      value: stats?.totalCustomers.toLocaleString() || '0',
      change: stats?.customerChange || 0,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      label: 'Invoices This Month',
      value: stats?.invoicesSent.toLocaleString() || '0',
      change: stats?.invoiceChange || 0,
      icon: FileText,
      color: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      label: 'Pending Payments',
      value: stats ? formatCurrency(stats.pendingPayments) : 'ETB 0',
      change: stats?.paymentChange || 0,
      icon: AlertCircle,
      color: 'bg-orange-500/10 text-orange-500',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <Skeleton className="h-10 w-10 rounded-lg mb-4" />
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              card.change >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {card.change >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(card.change)}%
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
