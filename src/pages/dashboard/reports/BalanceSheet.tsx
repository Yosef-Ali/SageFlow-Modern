import { useState } from 'react'
import { Loader2, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { getBalanceSheetReport } from '@/app/actions/report-actions'
import { formatCurrency } from '@/lib/utils'

export default function BalanceSheetPage() {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'bs', date],
    queryFn: () => getBalanceSheetReport({ date }),
  })

  // Safe accessors
  const { 
    assets = [], 
    liabilities = [], 
    equity = [], 
    totalAssets = 0, 
    totalLiabilities = 0, 
    totalEquity = 0 
  } = report?.data || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Balance Sheet</h1>
          <p className="text-muted-foreground mt-1">Assets, Liabilities, and Equity as of period end</p>
        </div>
        <div className="flex items-end gap-3">
           <div className="space-y-1">
             <Label className="text-xs">As Of</Label>
             <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
           </div>
           <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
             <Filter className="w-4 h-4 mr-2" />
             Run
           </Button>
           <Button variant="ghost" size="icon">
             <Download className="w-4 h-4" />
           </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-8 max-w-4xl mx-auto shadow-sm min-h-[600px]">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-8 font-mono text-sm md:text-base">
            <div className="text-center pb-6 border-b">
              <h2 className="text-xl font-bold">Balance Sheet</h2>
              <p className="text-muted-foreground">As of {date}</p>
            </div>

            {/* Assets */}
            <div>
              <h3 className="font-bold text-lg mb-3 text-emerald-600 dark:text-emerald-400">Assets</h3>
              <div className="space-y-2 pl-4">
                {assets.length > 0 ? (
                  assets.map((item: any) => (
                    <div key={item.id} className="flex justify-between hover:bg-muted/50 p-1 rounded">
                      <span>{item.name} <span className="text-xs text-muted-foreground">({item.account_number})</span></span>
                      <span>{formatCurrency(Number(item.balance))}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic p-1">No asset accounts</div>
                )}
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2 pl-4">
                <span>Total Assets</span>
                <span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />

            {/* Liabilities */}
            <div>
              <h3 className="font-bold text-lg mb-3 text-red-600 dark:text-red-400">Liabilities</h3>
              <div className="space-y-2 pl-4">
                {liabilities.length > 0 ? (
                  liabilities.map((item: any) => (
                    <div key={item.id} className="flex justify-between hover:bg-muted/50 p-1 rounded">
                      <span>{item.name} <span className="text-xs text-muted-foreground">({item.account_number})</span></span>
                      <span>{formatCurrency(Number(item.balance))}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic p-1">No liability accounts</div>
                )}
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2 pl-4">
                <span>Total Liabilities</span>
                <span>{formatCurrency(totalLiabilities)}</span>
              </div>
            </div>

            {/* Equity */}
            <div className="mt-8">
              <h3 className="font-bold text-lg mb-3 text-blue-600 dark:text-blue-400">Equity</h3>
              <div className="space-y-2 pl-4">
                {equity.length > 0 ? (
                  equity.map((item: any) => (
                    <div key={item.id} className="flex justify-between hover:bg-muted/50 p-1 rounded">
                      <span>{item.name} <span className="text-xs text-muted-foreground">({item.account_number})</span></span>
                      <span>{formatCurrency(Number(item.balance))}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic p-1">No equity accounts</div>
                )}
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2 pl-4">
                <span>Total Equity</span>
                <span>{formatCurrency(totalEquity)}</span>
              </div>
            </div>

            {/* Summary */}
             <div className="flex justify-between text-lg font-bold bg-muted/20 p-4 border-t-2 border-slate-800 rounded mt-8">
              <span>Total Liabilities & Equity</span>
              <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
            </div>
            
            <div className="text-xs text-center text-muted-foreground mt-4">
                Balance Equation Check: {totalAssets === (totalLiabilities + totalEquity) ? 'Balanced ✅' : 'Unbalanced ❌'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
