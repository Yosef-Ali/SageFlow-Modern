'use client'

import { useState, useCallback, useEffect } from 'react'
import { getProfitAndLoss } from '@/app/actions/report-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Label } from '@/components/ui/label'

export default function ProfitLossPage() {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const currentDay = today.toISOString().split('T')[0]

    const [startDate, setStartDate] = useState(firstDay)
    const [endDate, setEndDate] = useState(currentDay)
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<any>(null)

    const fetchReport = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getProfitAndLoss(new Date(startDate), new Date(endDate))
            if (res.success) {
                setReport(res.data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate])

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
                    <h1 className="text-2xl font-bold tracking-tight">Profit & Loss</h1>
                    <p className="text-muted-foreground">Income Statement from {formatDate(new Date(startDate))} to {formatDate(new Date(endDate))}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="grid gap-1">
                        <Label className="text-xs">Start Date</Label>
                        <Input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="w-auto h-8"
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs">End Date</Label>
                        <Input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="w-auto h-8"
                        />
                    </div>
                    <Button onClick={fetchReport} disabled={loading} className="mt-5 h-8">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Run'}
                    </Button>
                     <Button variant="outline" onClick={() => window.print()} className="mt-5 h-8">
                        Print
                    </Button>
                </div>
            </div>

            {report && (
                <div className="space-y-6 print:space-y-4">
                     <Card>
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg flex justify-between">
                                <span>Net Income</span>
                                <span className={report.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                    {formatCurrency(report.netIncome)}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-8">
                             {/* Income */}
                             <div>
                                <h3 className="font-semibold text-slate-700 mb-2 uppercase text-sm">Income</h3>
                                <div className="space-y-1 pl-2 border-l-2 border-emerald-100">
                                     {report.income.map((item: any) => (
                                        <div key={item.accountId} className="flex justify-between py-1 hover:bg-slate-50 px-2 rounded">
                                            <span>{item.accountName}</span>
                                            <span className="font-medium text-emerald-700">{formatCurrency(item.balance)}</span>
                                        </div>
                                    ))}
                                    {report.income.length === 0 && <div className="text-muted-foreground text-sm italic px-2">No income recorded.</div>}
                                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                                        <span>Total Income</span>
                                        <span>{formatCurrency(report.totalIncome)}</span>
                                    </div>
                                </div>
                             </div>

                             {/* Expenses */}
                             <div>
                                <h3 className="font-semibold text-slate-700 mb-2 uppercase text-sm">Expenses</h3>
                                <div className="space-y-1 pl-2 border-l-2 border-red-100">
                                     {report.expense.map((item: any) => (
                                        <div key={item.accountId} className="flex justify-between py-1 hover:bg-slate-50 px-2 rounded">
                                            <span>{item.accountName}</span>
                                            <span className="font-medium text-red-700">{formatCurrency(item.balance)}</span>
                                        </div>
                                    ))}
                                    {report.expense.length === 0 && <div className="text-muted-foreground text-sm italic px-2">No expenses recorded.</div>}
                                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                                        <span>Total Expenses</span>
                                        <span>{formatCurrency(report.totalExpense)}</span>
                                    </div>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
