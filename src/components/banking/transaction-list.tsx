'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowUpRight, ArrowDownLeft, Loader2, MoreHorizontal } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createBankTransaction } from '@/app/actions/banking-actions'
import { formatDate, formatCurrency } from '@/lib/utils'

interface TransactionListProps {
  accountId: string
  transactions: any[]
}

export function TransactionList({ accountId, transactions }: TransactionListProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [type, setType] = useState('DEPOSIT')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [category, setCategory] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const result = await createBankTransaction({
        bankAccountId: accountId,
        date: new Date(date),
        type: type as any,
        amount: Number(amount),
        description,
        reference,
        category
      })

      if (result.success) {
        setIsDialogOpen(false)
        setAmount('')
        setDescription('')
        setReference('')
        setCategory('')
        router.refresh()
      } else {
        alert(result.error || 'Failed to record transaction')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Transaction
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Transaction</DialogTitle>
                    <DialogDescription>Add a manual deposit or withdrawal.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                                    {/* Transfer logic more complex, stick to these for now */}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>Date</Label>
                             <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </div>
                     </div>
                     <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                     </div>
                     <div className="space-y-2">
                          <Label>Description</Label>
                          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. ATM Deposit" required />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Reference (Ref #)</Label>
                            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label>Category</Label>
                            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Sales" />
                        </div>
                     </div>
                     <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                          <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Save
                          </Button>
                      </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{formatDate(new Date(tx.date))}</TableCell>
                <TableCell>
                    <div className="font-medium">{tx.description}</div>
                    <div className="text-xs text-muted-foreground">{tx.reference}</div>
                </TableCell>
                <TableCell>
                    {tx.type === 'DEPOSIT' ? (
                        <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">
                             Deposit
                        </Badge>
                    ) : (
                         <Badge variant="outline" className="text-slate-600">
                             {tx.type}
                        </Badge>
                    )}
                </TableCell>
                <TableCell>{tx.category || '-'}</TableCell>
                <TableCell>
                     {tx.isReconciled ? (
                         <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Reconciled</Badge>
                     ) : (
                         <span className="text-xs text-slate-500">Uncleared</span>
                     )}
                </TableCell>
                <TableCell className={`text-right font-medium ${tx.type === 'DEPOSIT' ? 'text-emerald-600' : ''}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                </TableCell>
              </TableRow>
            ))}
             {transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No transactions found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
