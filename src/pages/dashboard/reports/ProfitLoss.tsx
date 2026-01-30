import { useState } from 'react'
import { Loader2, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { getProfitLossReport } from '@/app/actions/report-actions'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

export default function ProfitLossPage() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'pl', companyId, startDate, endDate],
    queryFn: () => getProfitLossReport(companyId, { startDate, endDate }),
    enabled: !!companyId,
  })

  // Safe data accessor
  const data = report?.data || { income: [], expenses: [], netIncome: 0, totalIncome: 0, totalExpenses: 0 }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss</h1>
          <p className="text-muted-foreground mt-1">Income Statement for the period</p>
        </div>
        <div className="flex items-end gap-3">
           <div className="space-y-1">
             <Label className="text-xs">From</Label>
             <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
           </div>
           <div className="space-y-1">
             <Label className="text-xs">To</Label>
             <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
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

      <div className="bg-card rounded-lg border p-8 max-w-4xl mx-auto shadow-sm min-h-[500px]">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-8 font-mono text-sm md:text-base">
            <div className="text-center pb-6 border-b">
              <h2 className="text-xl font-bold">Profit and Loss Statement</h2>
              <p className="text-muted-foreground">{startDate} to {endDate}</p>
            </div>

            {/* Income Section */}
            <div>
              <h3 className="font-bold text-lg mb-3">Income</h3>
              <div className="space-y-2 pl-4">
                {data.income?.length > 0 ? (
                  data.income.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between hover:bg-muted/50 p-1 rounded">
                      <span>{item.accountName}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic p-1">No income transactions</div>
                )}
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2 pl-4">
                <span>Total Income</span>
                <span>{formatCurrency(data.totalIncome || 0)}</span>
              </div>
            </div>

            {/* Expense Section */}
            <div>
              <h3 className="font-bold text-lg mb-3">Expenses</h3>
              <div className="space-y-2 pl-4">
                {data.expenses?.length > 0 ? (
                  data.expenses.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between hover:bg-muted/50 p-1 rounded">
                      <span>{item.accountName}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic p-1">No expense transactions</div>
                )}
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 mt-2 pt-2 pl-4">
                <span>Total Expenses</span>
                <span>{formatCurrency(data.totalExpenses || 0)}</span>
              </div>
            </div>

            {/* Net Income */}
            <div className="flex justify-between text-xl font-bold bg-muted/20 p-4 border-t-2 border-slate-800 rounded">
              <span>Net Income</span>
              <span className={data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                {formatCurrency(data.netIncome || 0)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
