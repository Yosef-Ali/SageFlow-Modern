'use client'

import Link from 'next/link'
import { Banknote, Plus, ArrowUpRight, ArrowDownRight, Building2, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBankAccounts, useBankingSummary, useDeleteBankAccount } from '@/hooks/use-banking'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const accountTypeColors: Record<string, string> = {
  CHECKING: 'bg-blue-100 text-blue-700',
  SAVINGS: 'bg-green-100 text-green-700',
  CASH: 'bg-yellow-100 text-yellow-700',
  CREDIT_CARD: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-slate-100 text-slate-700',
}

export default function BankingPage() {
  const { data: accounts, isLoading } = useBankAccounts()
  const { data: summary, isLoading: summaryLoading } = useBankingSummary()
  const deleteAccount = useDeleteBankAccount()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account? All transactions will be deleted.')) {
      await deleteAccount.mutateAsync(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Banking</h1>
          <p className="text-slate-600 mt-1">
            Manage bank accounts and transactions
          </p>
        </div>
        <Link href="/dashboard/banking/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-emerald-100 text-sm">Total Balance</span>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-32 bg-white/20" />
          ) : (
            <>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(summary?.totalBalance || 0)}
              </div>
              <p className="text-emerald-100 text-sm">
                Across {summary?.accountCount || 0} accounts
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-slate-600 text-sm">This Month</span>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(summary?.moneyIn || 0)}
              </div>
              <p className="text-slate-600 text-sm">Money In</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-slate-600 text-sm">This Month</span>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(summary?.moneyOut || 0)}
              </div>
              <p className="text-slate-600 text-sm">Money Out</p>
            </>
          )}
        </div>
      </div>

      {/* Accounts List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account: any) => (
            <div key={account.id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{account.accountName}</h3>
                  <p className="text-sm text-slate-500">{account.bankName || 'No bank specified'}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/banking/${account.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/banking/${account.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(account.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Current Balance</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    Number(account.currentBalance) >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatCurrency(Number(account.currentBalance))}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    accountTypeColors[account.accountType] || accountTypeColors.OTHER
                  )}>
                    {account.accountType}
                  </span>
                  {account.accountNumber && (
                    <span className="text-sm text-slate-500">
                      •••• {account.accountNumber.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No bank accounts connected
            </h3>
            <p className="text-slate-600 mb-6">
              Connect your bank accounts to track transactions, reconcile payments, and manage cash flow.
            </p>
            <Link href="/dashboard/banking/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Account
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
