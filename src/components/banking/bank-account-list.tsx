
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Building, Loader2 } from 'lucide-react'
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
import { DashboardHeader } from '@/components/dashboard/header'
import { useCreateBankAccount } from '@/hooks/use-banking'
import { formatCurrency } from '@/lib/utils'

interface BankAccountListProps {
  accounts: any[]
}

export function BankAccountList({ accounts }: BankAccountListProps) {
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const createAccount = useCreateBankAccount()

  // Form State
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [balance, setBalance] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAccount.mutateAsync({
        accountName: name,
        accountNumber: number,
        accountType: 'CHECKING',
        openingBalance: Number(balance) || 0,
        currency: 'ETB',
        isActive: true
      })

      setIsDialogOpen(false)
      setName('')
      setNumber('')
      setBalance('')
    } catch (err) {
      console.error(err)
    } finally {
    }
  }

  return (
    <div className="space-y-6">
       <DashboardHeader 
         heading="Banking" 
         text="Manage bank accounts and transactions."
       >
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                  <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Bank Account
                  </Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
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
                          <Button type="submit" disabled={createAccount.isPending}>
                              {createAccount.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Save Account
                          </Button>
                      </DialogFooter>
                  </form>
              </DialogContent>
           </Dialog>
       </DashboardHeader>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {accounts.map(account => (
               <Link to={`/dashboard/banking/${account.id}`} key={account.id}>
                    <Card className="hover:border-emerald-500 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {account.account_name || account.accountName}
                            </CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(Number(account.current_balance || account.currentBalance || 0))}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {account.account_number || account.accountNumber} • {account.currency}
                            </p>
                        </CardContent>
                    </Card>
               </Link>
           ))}
           {accounts.length === 0 && (
               <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
                   Banking accounts you add will appear here.
               </div>
           )}
       </div>
    </div>
  )
}
