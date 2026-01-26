import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useBankAccount, useBankTransactions, useReconcileTransactions } from '@/hooks/use-banking'

export default function ReconcileAccountPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: account } = useBankAccount(id || '')
  const { data: transactions = [] } = useBankTransactions(id || '')
  const reconcile = useReconcileTransactions()
  const [statementBalance, setStatementBalance] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const unreconciledTransactions = transactions.filter((t: any) => !t.is_reconciled)

  const toggleTransaction = (txId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(txId)) {
      newSelected.delete(txId)
    } else {
      newSelected.add(txId)
    }
    setSelected(newSelected)
  }

  const calculateDifference = () => {
    const accData = account as any
    const clearedBalance = unreconciledTransactions
      .filter((t: any) => selected.has(t.id))
      .reduce((sum: number, t: any) => {
        return sum + (t.type === 'DEPOSIT' ? Number(t.amount) : -Number(t.amount))
      }, Number(accData?.current_balance || 0))

    return Number(statementBalance) - clearedBalance
  }

  const handleReconcile = async () => {
    if (selected.size === 0) return
    await reconcile.mutateAsync(Array.from(selected))
    navigate(`/dashboard/banking/${id}`)
  }

  const difference = calculateDifference()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/banking/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Reconcile Account</h1>
          <p className="text-muted-foreground mt-1">{(account as any)?.account_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Statement Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Ending Balance from Statement</Label>
            <Input
              type="number"
              step="0.01"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              placeholder="0.00"
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-ET', { style: 'currency', currency: (account as any)?.currency || 'ETB' }).format(Number((account as any)?.current_balance) || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
              {new Intl.NumberFormat('en-ET', { style: 'currency', currency: account?.currency || 'ETB' }).format(difference)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unreconciled Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {unreconciledTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">All transactions are reconciled</p>
            ) : (
              unreconciledTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 border rounded hover:bg-accent">
                  <Checkbox checked={selected.has(tx.id)} onCheckedChange={() => toggleTransaction(tx.id)} />
                  <div className="flex-1">
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <div className={`font-medium ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}
                    {new Intl.NumberFormat('en-ET', { style: 'currency', currency: (account as any)?.currency || 'ETB' }).format(Number(tx.amount))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(`/dashboard/banking/${id}`)}>
          Cancel
        </Button>
        <Button
          onClick={handleReconcile}
          disabled={selected.size === 0 || Math.abs(difference) >= 0.01 || reconcile.isPending}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {reconcile.isPending ? 'Reconciling...' : 'Reconcile Selected'}
        </Button>
      </div>
    </div>
  )
}
