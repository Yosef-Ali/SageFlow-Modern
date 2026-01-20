'use client'

import { useState, useCallback, useEffect } from 'react'
import { getTrialBalance } from '@/app/actions/report-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function TrialBalancePage() {
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<any>(null)

    const fetchReport = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getTrialBalance(new Date(asOfDate))
            if (res.success) {
                setReport(res.data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [asOfDate])

    // Initial load
    useEffect(() => {
        fetchReport()
    }, [fetchReport])

    if (!report && loading) {
        return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
             <div className="flex items-center gap-4 no-print">
                <Link href="/dashboard/reports">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
                    <p className="text-muted-foreground">Debits vs Credits as of {formatDate(new Date(asOfDate))}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        type="date" 
                        value={asOfDate} 
                        onChange={(e) => setAsOfDate(e.target.value)} 
                        className="w-auto"
                    />
                    <Button onClick={fetchReport} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Report'}
                    </Button>
                     <Button variant="outline" onClick={() => window.print()}>
                        Print
                    </Button>
                </div>
            </div>

            {report && (
                 <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.items.map((item: any) => (
                                <TableRow key={item.accountId}>
                                    <TableCell className="font-medium">{item.accountName}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{item.accountType}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {Number(item.debit) > 0 ? formatCurrency(item.debit) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {Number(item.credit) > 0 ? formatCurrency(item.credit) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* Totals */}
                            <TableRow className="bg-muted/50 font-bold border-t-2">
                                <TableCell colSpan={2} className="text-right">Totals</TableCell>
                                <TableCell className="text-right">{formatCurrency(report.totalDebit)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(report.totalCredit)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    )
}
