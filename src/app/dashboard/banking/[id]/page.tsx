'use client'

import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Building2, ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useBankAccount, useBankTransactions, useDeleteBankAccount } from '@/hooks/use-banking'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BankAccountDetailPageProps {
  params: { id: string }
}

export default function BankAccountDetailPage({ params }: BankAccountDetailPageProps) {
  const { id } = params
  const router = useRouter()
  const { data: account, isLoading, error } = useBankAccount(id)
  const { data: transactions } = useBankTransactions(id)
  const deleteAccount = useDeleteBankAccount()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this account? All transactions will be deleted.')) {
      await deleteAccount.mutateAsync(id)
      router.push('/dashboard/banking')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Account not found</p>
          <Link href="/dashboard/banking">
            <Button variant="outline">Back to Banking</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/banking">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{account.accountName}</h1>
              {!account.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-slate-500">{account.bankName || 'No bank specified'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/banking/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-8 text-white">
        <p className="text-emerald-100 mb-2">Current Balance</p>
        <p className="text-4xl font-bold mb-4">
          {formatCurrency(Number(account.currentBalance))}
        </p>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-emerald-100">Account Type:</span>
            <span className="ml-2 font-medium">{account.accountType}</span>
          </div>
          {account.accountNumber && (
            <div>
              <span className="text-emerald-100">Account:</span>
              <span className="ml-2 font-medium">•••• {account.accountNumber.slice(-4)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
        
        {transactions && transactions.length > 0 ? (
          <div className="divide-y">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    tx.type === 'DEPOSIT' ? 'bg-green-100' : 'bg-red-100'
                  )}>
                    {tx.type === 'DEPOSIT' ? (
                      <ArrowDownRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-slate-500">{formatDate(new Date(tx.date))}</p>
                  </div>
                </div>
                <span className={cn(
                  'text-lg font-semibold',
                  tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'
                )}>
                  {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            No transactions recorded yet
          </div>
        )}
      </div>
    </div>
  )
}
