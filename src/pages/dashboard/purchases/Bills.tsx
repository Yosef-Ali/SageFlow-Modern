import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBills } from '@/hooks/use-purchases'
import { format } from 'date-fns'

export default function BillsPage() {
  const { data: bills, isLoading } = useBills()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bills</h1>
          <p className="text-muted-foreground mt-1">Manage vendor bills</p>
        </div>
        <Link to="/dashboard/purchases/bills/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Bill
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Bill #</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Vendor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Total</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
            ) : bills && bills.length > 0 ? (
              bills.map((bill: any) => (
                <tr key={bill.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-mono text-sm">{bill.bill_number}</td>
                  <td className="px-6 py-4">{format(new Date(bill.due_date), 'MMM dd, yyyy')}</td>
                  <td className="px-6 py-4">{bill.vendor?.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant={bill.status === 'PAID' ? 'default' : 'destructive'}>{bill.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(bill.total_amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/dashboard/purchases/bills/${bill.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No bills found</p>
                  <Link to="/dashboard/purchases/bills/new">
                    <Button variant="outline" className="mt-4">Record First Bill</Button>
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
