'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useBalanceSheet } from '@/hooks/use-reports'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(new Date())

  const { data: result, isLoading } = useBalanceSheet(asOf)
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
            href="/dashboard/reports" 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
            <p className="text-sm text-slate-500">
              As of {formatDate(report.period)}
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
            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">Balance Sheet</h2>
            <p className="text-slate-500">As of {formatDate(report.period)}</p>
          </div>

          <div className="space-y-12">
            {/* ASSETS */}
            <section>
              <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-900 pb-2 mb-4">
                ASSETS
              </h3>
              {report.assets.categories.map((category) => (
                <div key={category.name} className="mb-6">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 px-2">
                    {category.name}
                  </h4>
                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <div key={item.name} className="flex justify-between py-1 px-4 text-slate-600 hover:bg-slate-50 rounded transition-colors">
                        <span>{item.name}</span>
                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-slate-900 border-t border-slate-100 mt-2 px-4 italic">
                      <span>Total {category.name}</span>
                      <span className="font-mono">{formatCurrency(category.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between py-3 font-bold text-lg bg-emerald-50 text-emerald-900 rounded-lg px-4 mt-4 shadow-sm">
                <span>TOTAL ASSETS</span>
                <span className="font-mono">{formatCurrency(report.assets.total)}</span>
              </div>
            </section>

            {/* LIABILITIES & EQUITY */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-900 pb-2 mb-6">
                LIABILITIES & EQUITY
              </h3>
              
              {/* Liabilities */}
              <section className="mb-8">
                <h4 className="text-md font-bold text-slate-800 mb-4 px-2">LIABILITIES</h4>
                {report.liabilities.categories.map((category) => (
                  <div key={category.name} className="mb-4">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-4">
                      {category.name}
                    </h5>
                    <div className="space-y-1 px-4">
                      {category.items.map((item) => (
                        <div key={item.name} className="flex justify-between py-1 text-slate-600">
                          <span>{item.name}</span>
                          <span className="font-mono">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-slate-900 border-t border-slate-200 mt-2 px-4 bg-slate-50 rounded">
                  <span>Total Liabilities</span>
                  <span className="font-mono">{formatCurrency(report.liabilities.total)}</span>
                </div>
              </section>

              {/* Equity */}
              <section>
                <h4 className="text-md font-bold text-slate-800 mb-4 px-2">EQUITY</h4>
                {report.equity.categories.map((category) => (
                  <div key={category.name} className="space-y-1 px-4">
                    {category.items.map((item) => (
                      <div key={item.name} className="flex justify-between py-1 text-slate-600">
                        <span>{item.name}</span>
                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-slate-900 border-t border-slate-200 mt-2 px-4 bg-slate-50 rounded">
                  <span>Total Equity</span>
                  <span className="font-mono">{formatCurrency(report.equity.total)}</span>
                </div>
              </section>

              {/* Total L & E */}
              <div className="flex justify-between py-3 font-bold text-lg bg-blue-50 text-blue-900 rounded-lg px-4 mt-6 shadow-sm underline decoration-double">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono">{formatCurrency(report.liabilities.total + report.equity.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 italic">
              Confidence Score: {report.assets.total === (report.liabilities.total + report.equity.total) ? '100% (Balanced)' : 'Mismatch Detected'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
