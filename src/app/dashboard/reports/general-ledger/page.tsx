'use client'

import { useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGeneralLedger, useGLSummary } from '@/hooks/use-reports'
import { useAccounts } from '@/hooks/use-accounts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Loader2, FileText, Search, Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function GeneralLedgerPage() {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [accountId, setAccountId] = useState<string>('all')

  const filters = {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    accountId: accountId === 'all' ? undefined : accountId,
  }

  const { data: reportData, isLoading } = useGeneralLedger(filters)
  const { data: summary, isLoading: summaryLoading } = useGLSummary(filters)
  const { data: accountsData } = useAccounts()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <DashboardHeader
        heading="General Ledger"
        text="Detailed transaction history across all accounts."
      >
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </DashboardHeader>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accountsData?.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.accountNumber} - {acc.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                  setAccountId('all')
                }}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary?.totalDebit || 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary?.totalCredit || 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Net Movement</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <p className={`text-2xl font-bold ${(summary?.netBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary?.netBalance || 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Debit</th>
                  <th className="px-6 py-4 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : reportData && reportData.length > 0 ? (
                  reportData.map((line: any) => (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(line.date)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex flex-col">
                          <span>{line.reference}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{line.accountName}</span>
                          <span className="text-xs text-slate-500">{line.accountNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {line.description}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {parseFloat(line.debit) > 0 ? formatCurrency(parseFloat(line.debit)) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                         {parseFloat(line.credit) > 0 ? formatCurrency(parseFloat(line.credit)) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                      <p>No transactions found for the selected filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
