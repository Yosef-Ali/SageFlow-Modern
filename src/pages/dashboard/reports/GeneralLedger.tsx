import { useState } from 'react'
import { Loader2, Download, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { getGeneralLedger } from '@/app/actions/report-actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

export default function GeneralLedgerPage() {
  const { user } = useAuth()
  const companyId = user?.companyId || ''

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [searchTerm, setSearchTerm] = useState('')

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'gl', companyId, startDate, endDate],
    queryFn: () => getGeneralLedger(companyId, {
        dateFrom: new Date(startDate),
        dateTo: new Date(endDate)
    }),
    enabled: !!companyId,
  })

  const entries = report?.data || []

  // Client-side filtering if needed (or prefer server-side)
  // Flatten lines for display? A GL usually shows lines grouped by account or chronological.
  // The action returns Journal Entries with nested lines.
  // Standard GL view: Chronological list of all transactions.

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">General Ledger</h1>
          <p className="text-muted-foreground mt-1">Detailed history of all financial transactions</p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
           <div className="space-y-1">
             <Label className="text-xs">From</Label>
             <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
           </div>
           <div className="space-y-1">
             <Label className="text-xs">To</Label>
             <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
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

      <div className="bg-card rounded-lg border overflow-hidden shadow-sm min-h-[500px]">
         {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold w-32">Date</th>
                            <th className="text-left px-4 py-3 font-semibold">Reference</th>
                             <th className="text-left px-4 py-3 font-semibold">Description</th>
                            <th className="text-left px-4 py-3 font-semibold">Account</th>
                            <th className="text-right px-4 py-3 font-semibold w-32">Debit</th>
                            <th className="text-right px-4 py-3 font-semibold w-32">Credit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                    No transactions found for this period.
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry: any) => (
                                // We render each line of the entry as a row
                                entry.lines?.map((line: any, index: number) => (
                                    <tr key={line.id} className="hover:bg-muted/30 group">
                                        {/* Only show Entry details on first line */}
                                        <td className="px-4 py-2 align-top">
                                            {index === 0 && (
                                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                                    {formatDate(entry.date)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 align-top">
                                            {index === 0 && (
                                                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                                    {entry.entry_number}
                                                </span>
                                            )}
                                        </td>
                                         <td className="px-4 py-2 align-top">
                                             <div className="truncate max-w-[200px]" title={line.description || entry.description}>
                                                 {line.description || entry.description}
                                             </div>
                                         </td>
                                        <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">
                                            {line.account?.name || 'Unknown Account'}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">
                                            {line.type === 'DEBIT' ? formatCurrency(line.amount) : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">
                                            {line.type === 'CREDIT' ? formatCurrency(line.amount) : '-'}
                                        </td>
                                    </tr>
                                ))
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  )
}
