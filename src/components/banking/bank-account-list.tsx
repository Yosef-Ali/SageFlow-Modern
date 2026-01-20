'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Building, Loader2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createBankAccount } from '@/app/actions/banking-actions'
import { formatCurrency } from '@/lib/utils'

interface BankAccountListProps {
  accounts: any[]
}

export function BankAccountList({ accounts }: BankAccountListProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [balance, setBalance] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const result = await createBankAccount({
        name,
        accountNumber: number,
        openingBalance: Number(balance) || 0,
        currency: 'ETB'
      })
      
      if (result.success) {
        setIsDialogOpen(false)
        setName('')
        setNumber('')
        setBalance('')
        router.refresh()
      } else {
        alert(result.error || 'Failed to create account')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-end">
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                  <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Bank Account
                  </Button>
              </DialogTrigger>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Add Bank Account</DialogTitle>
                      <DialogDescription>
                          Connect a new account to track transactions.
                      </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4 py-4">
                      <div className="space-y-2">
                          <Label>Account Name</Label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CBE Savings" required />
                      </div>
                      <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1000..." required />
                      </div>
                      <div className="space-y-2">
                          <Label>Opening Balance</Label>
                          <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" />
                      </div>
                      <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                          <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Save Account
                          </Button>
                      </DialogFooter>
                  </form>
              </DialogContent>
           </Dialog>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {accounts.map(account => (
               <Link href={`/dashboard/banking/${account.id}`} key={account.id}>
                    <Card className="hover:border-emerald-500 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {account.name}
                            </CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(Number(account.currentBalance))}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {account.accountNumber} • {account.currency}
                            </p>
                        </CardContent>
                    </Card>
               </Link>
           ))}
           {accounts.length === 0 && (
               <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed">
                   Banking accounts you add will appear here.
               </div>
           )}
       </div>
    </div>
  )
}
