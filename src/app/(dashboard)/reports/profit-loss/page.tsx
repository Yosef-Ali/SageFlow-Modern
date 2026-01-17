'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useProfitLoss } from '@/hooks/use-reports'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export default function ProfitLossPage() {
  const [period, setPeriod] = useState({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  })

  const { data: result, isLoading } = useProfitLoss(period.from, period.to)
  const report = result?.data

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500">Failed to load report data.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/reports" 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profit & Loss</h1>
            <p className="text-sm text-slate-500">
              For the period {formatDate(report.period.from)} to {formatDate(report.period.to)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Company Info */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">Profit & Loss Statement</h2>
            <p className="text-slate-500">Prepared on {formatDate(new Date())}</p>
          </div>

          <div className="space-y-8">
            {/* Revenue */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
                Revenue
              </h3>
              <div className="space-y-2">
                {report.revenue.items.map((item) => (
                  <div key={item.name} className="flex justify-between py-1 text-slate-600">
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-slate-900 bg-slate-50 px-3 rounded mt-2">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(report.revenue.total)}</span>
                </div>
              </div>
            </section>

            {/* COGS */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
                Cost of Goods Sold
              </h3>
              <div className="space-y-2">
                {report.cogs.items.map((item) => (
                  <div key={item.name} className="flex justify-between py-1 text-slate-600">
                    <span>{item.name}</span>
                    <span>({formatCurrency(item.amount)})</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-slate-900 bg-slate-50 px-3 rounded mt-2">
                  <span>Total COGS</span>
                  <span>({formatCurrency(report.cogs.total)})</span>
                </div>
              </div>
            </section>

            {/* Gross Profit */}
            <div className="flex justify-between py-3 border-y-2 border-slate-900 font-bold text-lg text-slate-900 px-3">
              <span>Gross Profit</span>
              <span>{formatCurrency(report.grossProfit)}</span>
            </div>

            {/* Expenses */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
                Operating Expenses
              </h3>
              <div className="space-y-2">
                {report.expenses.items.length > 0 ? (
                  report.expenses.items.map((item) => (
                    <div key={item.name} className="flex justify-between py-1 text-slate-600">
                      <span>{item.name}</span>
                      <span>({formatCurrency(item.amount)})</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic py-2">No operating expenses recorded in this period.</p>
                )}
                <div className="flex justify-between py-2 font-bold text-slate-900 bg-slate-50 px-3 rounded mt-2">
                  <span>Total Operating Expenses</span>
                  <span>({formatCurrency(report.expenses.total)})</span>
                </div>
              </div>
            </section>

            {/* Net Income */}
            <div className={`flex justify-between py-4 rounded-lg px-4 text-white ${
              report.netIncome >= 0 ? 'bg-emerald-600' : 'bg-red-600'
            }`}>
              <div className="flex items-center gap-3">
                {report.netIncome >= 0 ? (
                  <TrendingUp className="w-8 h-8 opacity-80" />
                ) : (
                  <TrendingDown className="w-8 h-8 opacity-80" />
                )}
                <span className="text-xl font-bold uppercase tracking-wide">Net Income</span>
              </div>
              <span className="text-2xl font-black">{formatCurrency(report.netIncome)}</span>
            </div>
          </div>

          {/* Footer Disclaimer */}
          <div className="mt-16 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 italic">
              * This is a computer-generated financial statement. All amounts are in ETB unless otherwise noted.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
