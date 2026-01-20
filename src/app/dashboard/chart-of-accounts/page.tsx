'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccounts, useAccountsSummary, useDeleteAccount } from '@/hooks/use-accounts'

const typeColors: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-purple-100 text-purple-800',
  REVENUE: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-orange-100 text-orange-800',
}

const typeIcons: Record<string, React.ReactNode> = {
  ASSET: <Wallet className="h-4 w-4" />,
  LIABILITY: <TrendingDown className="h-4 w-4" />,
  EQUITY: <PiggyBank className="h-4 w-4" />,
  REVENUE: <TrendingUp className="h-4 w-4" />,
  EXPENSE: <Receipt className="h-4 w-4" />,
}

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  const { data: accounts, isLoading } = useAccounts({ 
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: search || undefined 
  })
  const { data: summary, isLoading: summaryLoading } = useAccountsSummary()
  const deleteAccount = useDeleteAccount()
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      await deleteAccount.mutateAsync(id)
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
    }).format(value)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your accounting structure</p>
        </div>
        <Link href="/dashboard/chart-of-accounts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </Link>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {summaryLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.assets.count || 0}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(summary?.assets.balance || 0)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Liabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.liabilities.count || 0}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(summary?.liabilities.balance || 0)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-purple-500" />
                  Equity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.equity.count || 0}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(summary?.equity.balance || 0)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.revenue.count || 0}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(summary?.revenue.balance || 0)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-orange-500" />
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.expenses.count || 0}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(summary?.expenses.balance || 0)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ASSET">Assets</SelectItem>
            <SelectItem value="LIABILITY">Liabilities</SelectItem>
            <SelectItem value="EQUITY">Equity</SelectItem>
            <SelectItem value="REVENUE">Revenue</SelectItem>
            <SelectItem value="EXPENSE">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Accounts Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Account #</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Type</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Balance</th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto" /></td>
                </tr>
              ))
            ) : accounts && accounts.length > 0 ? (
              accounts.map((account) => (
                <tr key={account.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{account.accountNumber}</td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/chart-of-accounts/${account.id}`} className="font-medium hover:underline">
                      {account.accountName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={typeColors[account.type] + ' flex items-center gap-1 w-fit'}>
                      {typeIcons[account.type]}
                      {account.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(parseFloat(account.balance || '0'))}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={account.isActive ? 'default' : 'secondary'}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/chart-of-accounts/${account.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(account.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No accounts found</p>
                  <p className="text-slate-400 text-sm mt-1">Create your first account to get started</p>
                  <Link href="/dashboard/chart-of-accounts/new">
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Total Count */}
      {accounts && accounts.length > 0 && (
        <p className="text-sm text-slate-500 text-center">
          Showing {accounts.length} of {summary?.total || 0} accounts
        </p>
      )}
    </div>
  )
}
