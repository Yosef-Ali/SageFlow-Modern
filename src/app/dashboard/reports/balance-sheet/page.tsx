'use client'

import { useState, useCallback, useEffect } from 'react'
import { getBalanceSheet } from '@/app/actions/report-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function BalanceSheetPage() {
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<any>(null)

    const fetchReport = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getBalanceSheet(new Date(asOfDate))
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
                    <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
                    <p className="text-muted-foreground">As of {formatDate(new Date(asOfDate))}</p>
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
                <div className="space-y-6 print:space-y-4">
                    {/* Assets */}
                    <Card>
                        <CardHeader className="bg-muted/50 border-b">
                            <CardTitle className="text-lg flex justify-between">
                                <span>Assets</span>
                                <span>{formatCurrency(report.totalAssets)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-2">
                                {report.assets.map((item: any) => (
                                    <div key={item.accountId} className="flex justify-between py-1 hover:bg-muted/50 px-2 rounded">
                                        <span>{item.accountName}</span>
                                        <span className="font-medium">{formatCurrency(item.balance)}</span>
                                    </div>
                                ))}
                                {report.assets.length === 0 && <div className="text-muted-foreground text-sm italic">No assets found.</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Liabilities & Equity */}
                     <Card>
                        <CardHeader className="bg-muted/50 border-b">
                            <CardTitle className="text-lg flex justify-between">
                                <span>Liabilities & Equity</span>
                                <span>{formatCurrency(report.totalLiabilitiesAndEquity)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-8">
                              <div>
                                <h3 className="font-semibold text-muted-foreground mb-2 uppercase text-sm">Liabilities</h3>
                                <div className="space-y-1 pl-2 border-l-2 border-border">
                                     {report.liabilities.map((item: any) => (
                                        <div key={item.accountId} className="flex justify-between py-1">
                                            <span>{item.accountName}</span>
                                            <span className="font-medium">{formatCurrency(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                                        <span>Total Liabilities</span>
                                        <span>{formatCurrency(report.liabilities.reduce((s:any, i:any) => s + i.balance, 0))}</span>
                                    </div>
                                </div>
                             </div>

                              <div>
                                <h3 className="font-semibold text-muted-foreground mb-2 uppercase text-sm">Equity</h3>
                                <div className="space-y-1 pl-2 border-l-2 border-border">
                                     {report.equity.map((item: any) => (
                                        <div key={item.accountId} className="flex justify-between py-1">
                                            <span>{item.accountName}</span>
                                            <span className="font-medium">{formatCurrency(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                                        <span>Total Equity</span>
                                        <span>{formatCurrency(report.equity.reduce((s:any, i:any) => s + i.balance, 0))}</span>
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
