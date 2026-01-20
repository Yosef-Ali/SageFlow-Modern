'use client'

import Link from 'next/link'
import { Eye, Edit, MoreHorizontal, CreditCard } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Bill {
  id: string
  billNumber: string
  date: Date
  dueDate: Date
  totalAmount: number | string
  paidAmount: number | string
  status: string
  vendor: {
    name: string
  }
}

export function BillTable({ bills }: { bills: Bill[] }) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-lg border border-slate-200 dark:border-border">
        <h3 className="text-lg font-medium text-foreground mb-1">No Bills Found</h3>
        <p className="text-slate-500 mb-4">Record your first vendor bill to get started.</p>
        <Link href="/dashboard/purchases/bills/new">
          <Button>Enter Bill</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bill #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => {
             const isOverdue = new Date(bill.dueDate) < new Date() && bill.status !== 'PAID'
             
             return (
            <TableRow key={bill.id}>
              <TableCell className="font-mono text-sm font-medium">
                {bill.billNumber}
              </TableCell>
              <TableCell>{bill.vendor.name}</TableCell>
              <TableCell>{formatDate(new Date(bill.date))}</TableCell>
              <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>
                 {formatDate(new Date(bill.dueDate))}
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(Number(bill.totalAmount))}
              </TableCell>
               <TableCell>
                {formatCurrency(Number(bill.paidAmount))}
              </TableCell>
              <TableCell>
                <Badge variant={bill.status === 'PAID' ? 'secondary' : (isOverdue ? 'destructive' : 'default')}>
                  {bill.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/purchases/bills/${bill.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    {bill.status !== 'PAID' && (
                        <DropdownMenuItem asChild>
                        <Link href={`/dashboard/purchases/bills/${bill.id}/pay`}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Record Payment
                        </Link>
                        </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  )
}
