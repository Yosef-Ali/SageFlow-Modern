'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Eye, Edit, XCircle, Send, FileText } from 'lucide-react'
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
import { InvoiceStatusBadge } from './invoice-status-badge'
import { useCancelInvoice, useUpdateInvoiceStatus } from '@/hooks/use-invoices'
import { InvoiceStatus } from '@prisma/client'

interface Invoice {
  id: string
  invoiceNumber: string
  date: Date
  dueDate: Date
  total: any
  paidAmount: any
  status: InvoiceStatus
  customer: {
    id: string
    name: string
  }
}

interface InvoiceTableProps {
  invoices: Invoice[]
  isLoading?: boolean
}

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  const cancelInvoice = useCancelInvoice()
  const updateStatus = useUpdateInvoiceStatus()

  const handleCancel = async (id: string) => {
    if (confirm('Are you sure you want to cancel this invoice?')) {
      await cancelInvoice.mutateAsync(id)
    }
  }

  const handleMarkSent = async (id: string) => {
    await updateStatus.mutateAsync({ id, status: 'SENT' })
  }

  if (!isLoading && invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border border-slate-200">
        <FileText className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">No invoices yet</h3>
        <p className="text-slate-500 mb-4">Get started by creating your first invoice</p>
        <Link href="/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const total = Number(invoice.total)
            const paidAmount = Number(invoice.paidAmount)
            const isOverdue = new Date(invoice.dueDate) < new Date() && 
                             !['PAID', 'CANCELLED'].includes(invoice.status)

            return (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-sm font-medium">
                  <Link 
                    href={`/invoices/${invoice.id}`}
                    className="text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{invoice.customer.name}</TableCell>
                <TableCell>{formatDate(new Date(invoice.date))}</TableCell>
                <TableCell className={isOverdue ? 'text-red-600' : ''}>
                  {formatDate(new Date(invoice.dueDate))}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{formatCurrency(total)}</div>
                    {paidAmount > 0 && paidAmount < total && (
                      <div className="text-xs text-slate-500">
                        Paid: {formatCurrency(paidAmount)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
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
                        <Link href={`/invoices/${invoice.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {invoice.status === 'DRAFT' && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${invoice.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkSent(invoice.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Mark as Sent
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {!['PAID', 'CANCELLED'].includes(invoice.status) && (
                        <DropdownMenuItem
                          onClick={() => handleCancel(invoice.id)}
                          className="text-red-600"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      )}
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
