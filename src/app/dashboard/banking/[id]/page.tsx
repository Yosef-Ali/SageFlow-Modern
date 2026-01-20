import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBankAccount } from '@/app/actions/banking-actions'
import { TransactionList } from '@/components/banking/transaction-list'
import { formatCurrency } from '@/lib/utils'

export default async function BankAccountPage({ params }: { params: { id: string } }) {
  const result = await getBankAccount(params.id)
  
  if (!result.success || !result.data) {
    notFound()
  }

  const account = result.data

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/dashboard/banking">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
             <span className="text-muted-foreground text-sm font-medium pt-1">
                {account.accountNumber}
             </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
             <Link href={`/dashboard/banking/${account.id}/reconcile`}>
                <Button variant="outline">
                    <FileCheck className="w-4 h-4 mr-2" />
                    Reconcile Account
                </Button>
            </Link>
        </div>
      </div>

      {/* Account Summary Card */}
       <div className="bg-white p-6 rounded-lg border border-slate-200">
             <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Current Balance</h3>
             <div className="text-4xl font-bold text-slate-900">
                 {formatCurrency(Number(account.currentBalance))} 
                 <span className="text-lg text-slate-500 font-normal ml-2">{account.currency}</span>
             </div>
       </div>

      <TransactionList accountId={account.id} transactions={account.transactions} />
    </div>
  )
}
