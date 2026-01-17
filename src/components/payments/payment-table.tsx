'use client'

import Link from 'next/link'
import { MoreHorizontal, Eye, Trash2, Receipt } from 'lucide-react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useDeletePayment } from '@/hooks/use-payments'
import { getPaymentMethodLabel, paymentMethodColors } from '@/types/payment'
import { cn } from '@/lib/utils'

interface Payment {
  id: string
  amount: any
  paymentDate: Date
  paymentMethod: string
  reference: string | null
  customer: {
    id: string
    name: string
  }
  invoice?: {
    id: string
    invoiceNumber: string
  } | null
}

interface PaymentTableProps {
  payments: Payment[]
  isLoading?: boolean
}

export function PaymentTable({ payments, isLoading }: PaymentTableProps) {
  const deletePayment = useDeletePayment()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment? This will also update the associated invoice.')) {
      await deletePayment.mutateAsync(id)
    }
  }

  if (!isLoading && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border border-slate-200">
        <Receipt className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">No payments yet</h3>
        <p className="text-slate-500 mb-4">Record your first payment to get started</p>
        <Link href="/payments/new">
          <Button>Record Payment</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const methodColors = paymentMethodColors[payment.paymentMethod] || { bg: 'bg-slate-100', text: 'text-slate-700' }
            
            return (
              <TableRow key={payment.id}>
                <TableCell>{formatDate(new Date(payment.paymentDate))}</TableCell>
                <TableCell className="font-medium">{payment.customer.name}</TableCell>
                <TableCell>
                  {payment.invoice ? (
                    <Link
                      href={`/invoices/${payment.invoice.id}`}
                      className="text-emerald-600 hover:underline"
                    >
                      {payment.invoice.invoiceNumber}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', methodColors.bg, methodColors.text)}>
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </span>
                </TableCell>
                <TableCell className="text-slate-500">
                  {payment.reference || '—'}
                </TableCell>
                <TableCell className="text-right font-semibold text-emerald-600">
                  {formatCurrency(Number(payment.amount))}
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
                        <Link href={`/payments/${payment.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
