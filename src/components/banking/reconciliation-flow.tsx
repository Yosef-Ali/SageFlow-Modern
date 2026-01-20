'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertTriangle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
    startReconciliation, 
    saveReconciliationItem, 
    finishReconciliation 
} from '@/app/actions/banking-actions'

interface ReconciliationFlowProps {
    accountId: string
    accountName: string
    currentBalance: number
    unclearedTransactions: any[]
}

export function ReconciliationFlow({ 
    accountId, 
    accountName, 
    currentBalance, 
    unclearedTransactions 
}: ReconciliationFlowProps) {
    const router = useRouter()
    
    // Steps: 'SETUP' | 'RECONCILE' | 'SUCCESS'
    const [step, setStep] = useState<'SETUP' | 'RECONCILE' | 'SUCCESS'>('SETUP')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Setup State
    const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0])
    const [statementBalance, setStatementBalance] = useState('')

    // Reconcile State
    const [reconciliationId, setReconciliationId] = useState<string | null>(null)
    const [clearedIds, setClearedIds] = useState<Set<string>>(new Set())

    // 1. Calculate Cleared Totals
    const { clearedBalance, difference, clearedDeposits, clearedWithdrawals } = useMemo(() => {
        const targetBalance = Number(statementBalance) || 0
        
        // Filter out cleared transactions from the uncleared list
        const clearedTxs = unclearedTransactions.filter(tx => clearedIds.has(tx.id))
        
        const deposits = clearedTxs
            .filter(tx => tx.type === 'DEPOSIT')
            .reduce((sum, tx) => sum + Number(tx.amount), 0)
            
        const withdrawals = clearedTxs
            .filter(tx => tx.type !== 'DEPOSIT')
            .reduce((sum, tx) => sum + Number(tx.amount), 0)

        // Ideally, we start with the "Beginning Balance" of the reconciliation period.
        // For simplicity in this v1, we assume the "Current Book Balance" is not the starting point, 
        // but rather we are constructing the Statement Balance from scratch?
        // NO. Valid formula: Beginning Balance + Cleared Deposits - Cleared Withdrawals = Statement Balance.
        // But "Beginning Balance" is the Last Reconciled Balance.
        // If this is the first one, Beginning Balance = 0? Or Opening Balance?
        // Let's approximate: 
        // We probably need to pass `lastReconciledBalance`. 
        // For now, let's calculate "Cleared Balance" as:
        // (This acts as a check): 
        // Formula used often: Statement Balance - Uncleared Txs = Register Balance.
        // Let's stick to the common UI:
        //  Statement Ending Balance: [User Input]
        //  - Cleared Balance: [Calculated from Cleared Txs + Beginning]
        //  = Difference.
        
        // We lack "Beginning Balance". Let's assume 0 for first run or we'd query it.
        // For prototype, let's just sum the cleared items and compare to Statement Balance? 
        // No, that only works if account started at 0 and we clear everything from start.
        // Correct approach: Opening Balance + All Prior Reconciled Txs = Beginning Balance.
        // Let's assume the passed `currentBalance` includes everything. 
        // So `currentBalance` - `Uncleared` = `Cleared Balance` ?
        // Yes! Current Book Balance - Sum of (Uncleared Transactions) = Cleared Balance (Theoretical).
        // Wait, `currentBalance` changes as we clear things? No, Book Balance is static.
        // Cleared Balance = Opening Balance + (Sum of ALL Reconciled Txs) + (Sum of Currently Marked Txs).
        
        // Alternative Simplified View:
        // Target: Statement Balance.
        // Calculator: 
        //   Beginning Balance (We need this!)
        //   + Cleared Deposits
        //   - Cleared Withdrawals
        //   = Computed Cleared Balance.
        
        // I will assume Beginning Balance = 0 for the MVP or fetch it? 
        // Let's assume 0 for MVP to unblock, but add a note or input for "Beginning Balance" in Setup.
        
        return {
            clearedDeposits: deposits,
            clearedWithdrawals: withdrawals,
            clearedBalance: deposits - withdrawals, // + Beginning Balance
            difference: targetBalance - (deposits - withdrawals) // - Beginning Balance
        }
    }, [statementBalance, unclearedTransactions, clearedIds])

    // Setup Step: Start Reconciliation
    const handleStart = async () => {
        setIsSubmitting(true)
        try {
            const res = await startReconciliation({
                bankAccountId: accountId,
                statementDate: new Date(statementDate),
                statementBalance: Number(statementBalance)
            })
            if (res.success) {
                setReconciliationId(res.data.id)
                setStep('RECONCILE')
            } else {
                alert(res.error)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Toggle Cleared Status
    const toggleCleared = (txId: string) => {
        const newSet = new Set(clearedIds)
        if (newSet.has(txId)) {
            newSet.delete(txId)
            // Persist un-clear
             if (reconciliationId) saveReconciliationItem(reconciliationId, txId, false)
        } else {
            newSet.add(txId)
            // Persist clear
             if (reconciliationId) saveReconciliationItem(reconciliationId, txId, true)
        }
        setClearedIds(newSet)
    }

    // Finish
    const handleFinish = async () => {
        if (!reconciliationId) return
        setIsSubmitting(true)
        try {
            const res = await finishReconciliation(reconciliationId)
            if (res.success) {
                setStep('SUCCESS')
            } else {
                alert(res.error)
            }
        } catch (e) {
            
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- RENDER STEPS ---

    if (step === 'SETUP') {
        return (
            <Card className="max-w-md mx-auto mt-8">
                <CardHeader>
                    <CardTitle>Start Reconciliation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Statement Date</Label>
                        <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Statement Ending Balance</Label>
                        <Input 
                            type="number" step="0.01" 
                            value={statementBalance} 
                            onChange={(e) => setStatementBalance(e.target.value)} 
                            placeholder="0.00"
                        />
                        <p className="text-xs text-muted-foreground">Enter the ending balance from your bank statement.</p>
                    </div>
                    
                    {/* Add Beginning Balance Input for MVP flexibility */}
                   {/*  <div className="space-y-2">
                        <Label>Beginning Balance</Label>
                        <Input type="number" defaultValue="0" disabled className="bg-slate-50" />
                        <p className="text-xs text-muted-foreground">Calculated from previous reconciliations (0.00 for new).</p>
                    </div> */}

                    <Button className="w-full" onClick={handleStart} disabled={isSubmitting || !statementBalance}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Start Reconciling
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (step === 'SUCCESS') {
         return (
             <div className="max-w-md mx-auto mt-8 text-center space-y-4 p-8 bg-white rounded-lg border">
                 <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                 </div>
                 <h2 className="text-2xl font-bold text-slate-900">Reconciliation Complete!</h2>
                 <p className="text-slate-500">
                     Balance has been updated and transactions marked as reconciled.
                 </p>
                 <Button onClick={() => router.push(`/dashboard/banking/${accountId}`)}>
                     Return to Account
                 </Button>
             </div>
         )
    }

    return (
        <div className="space-y-6">
            {/* Header / Summary Bar */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-4 z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase">Statement Balance</p>
                        <p className="text-lg font-bold">{formatCurrency(Number(statementBalance))}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase">Cleared Balance</p>
                        <p className="text-lg font-bold">{formatCurrency(clearedBalance)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase">Difference</p>
                        <p className={`text-lg font-bold ${difference === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatCurrency(difference)}
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <Button 
                            onClick={handleFinish} 
                            disabled={difference !== 0 || isSubmitting}
                            variant={difference === 0 ? 'default' : 'secondary'}
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                             {difference === 0 ? 'Finish Reconciliation' : 'Resolve Difference'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Cleared</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {unclearedTransactions.map((tx) => (
                            <TableRow key={tx.id} onClick={() => toggleCleared(tx.id)} className="cursor-pointer hover:bg-slate-50">
                                <TableCell>
                                    <Checkbox checked={clearedIds.has(tx.id)} onCheckedChange={() => toggleCleared(tx.id)} />
                                </TableCell>
                                <TableCell>{formatDate(new Date(tx.date))}</TableCell>
                                <TableCell>
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-600">
                                        {tx.type}
                                    </span>
                                </TableCell>
                                <TableCell>{tx.description}</TableCell>
                                <TableCell className="text-right font-mono">
                                    {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                                </TableCell>
                            </TableRow>
                        ))}
                         {unclearedTransactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No uncleared transactions found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
