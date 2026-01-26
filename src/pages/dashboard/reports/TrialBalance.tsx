import { useState } from 'react'
import { Loader2, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { getTrialBalanceReport } from '@/app/actions/report-actions'
import { formatCurrency } from '@/lib/utils'

export default function TrialBalancePage() {
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'tb', date],
    queryFn: () => getTrialBalanceReport({ date }),
  })

  const accounts = report?.data?.accounts || []
  const totals = report?.data?.totals || { debit: 0, credit: 0 }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Trial Balance</h1>
          <p className="text-muted-foreground mt-1">Balances of all ledger accounts</p>
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

      <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
        <div className="p-6 text-center border-b">
            <h2 className="text-xl font-bold">Trial Balance</h2>
            <p className="text-muted-foreground">As of {date}</p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
                <tr>
                    <th className="text-left px-6 py-3 font-semibold">Account</th>
                    <th className="text-left px-6 py-3 font-semibold w-24">Type</th>
                    <th className="text-right px-6 py-3 font-semibold w-40">Debit</th>
                    <th className="text-right px-6 py-3 font-semibold w-40">Credit</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {accounts.length > 0 ? (
                    accounts.map((acc: any) => (
                        <tr key={acc.id} className="hover:bg-muted/30">
                            <td className="px-6 py-3">
                                <div className="font-medium">{acc.name}</div>
                                <div className="text-xs text-muted-foreground">{acc.code}</div>
                            </td>
                            <td className="px-6 py-3 text-muted-foreground">{acc.type}</td>
                            <td className="px-6 py-3 text-right font-mono text-emerald-600">
                                {acc.debit > 0 ? formatCurrency(acc.debit) : '-'}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-emerald-600">
                                {acc.credit > 0 ? formatCurrency(acc.credit) : '-'}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                            No account balances found.
                        </td>
                    </tr>
                )}
            </tbody>
            <tfoot className="bg-muted/50 font-bold border-t">
                <tr>
                    <td colSpan={2} className="px-6 py-4 text-right uppercase text-xs tracking-wider">Totals</td>
                    <td className="px-6 py-4 text-right font-mono border-t border-slate-400">
                        {formatCurrency(totals.debit || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono border-t border-slate-400">
                        {formatCurrency(totals.credit || 0)}
                    </td>
                </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
