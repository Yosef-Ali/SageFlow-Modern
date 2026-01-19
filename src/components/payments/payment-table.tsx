'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Eye, Trash2, Receipt, Edit } from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setPaymentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (paymentToDelete) {
      await deletePayment.mutateAsync(paymentToDelete)
      setDeleteDialogOpen(false)
      setPaymentToDelete(null)
    }
  }

  if (!isLoading && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-lg border">
        <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No payments yet</h3>
        <p className="text-muted-foreground mb-4">Record your first payment to get started</p>
        <Link href="/dashboard/payments/new">
          <Button>Record Payment</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden bg-card">
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
              const methodColors = paymentMethodColors[payment.paymentMethod] || { bg: 'bg-muted', text: 'text-muted-foreground' }
              
              return (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(new Date(payment.paymentDate))}</TableCell>
                  <TableCell className="font-medium">{payment.customer.name}</TableCell>
                  <TableCell>
                    {payment.invoice ? (
                      <Link
                        href={`/dashboard/invoices/${payment.invoice.id}`}
                        className="text-primary hover:underline"
                      >
                        {payment.invoice.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', methodColors.bg, methodColors.text)}>
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.reference || '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
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
                          <Link href={`/dashboard/payments/${payment.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/payments/${payment.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(payment.id)}
                          className="text-destructive"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This will also update the associated invoice. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
