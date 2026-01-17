'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, Printer, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoice, useUpdateInvoiceStatus } from '@/hooks/use-invoices'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = use(params)
  const { data: invoice, isLoading, error } = useInvoice(id)
  const updateStatus = useUpdateInvoiceStatus()

  const handleMarkSent = async () => {
    await updateStatus.mutateAsync({ id, status: 'SENT' })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Invoice not found</p>
          <Link href="/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = Number(invoice.subtotal)
  const taxAmount = Number(invoice.taxAmount)
  const total = Number(invoice.total)
  const paidAmount = Number(invoice.paidAmount)
  const balance = total - paidAmount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-slate-500">
              Created on {formatDate(new Date(invoice.createdAt))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <>
              <Button variant="outline" onClick={handleMarkSent}>
                <Send className="h-4 w-4 mr-2" />
                Mark as Sent
              </Button>
              <Link href={`/invoices/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </>
          )}
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white p-8 rounded-lg border border-slate-200 space-y-8">
        {/* Header Section */}
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">INVOICE</h2>
            <p className="text-lg font-mono text-slate-600">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Invoice Date</p>
            <p className="font-medium">{formatDate(new Date(invoice.date))}</p>
            <p className="text-sm text-slate-500 mt-2">Due Date</p>
            <p className="font-medium">{formatDate(new Date(invoice.dueDate))}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="border-t pt-6">
          <p className="text-sm text-slate-500 mb-1">Bill To</p>
          <p className="font-semibold text-lg">{invoice.customer?.name}</p>
          {invoice.customer?.email && (
            <p className="text-slate-600">{invoice.customer.email}</p>
          )}
          {invoice.customer?.phone && (
            <p className="text-slate-600">{invoice.customer.phone}</p>
          )}
        </div>

        {/* Line Items */}
        <div className="border-t pt-6">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 text-sm font-medium text-slate-500">Description</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Qty</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Unit Price</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">VAT</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-right">{Number(item.quantity)}</td>
                  <td className="py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="py-3 text-right">{(Number(item.taxRate) * 100).toFixed(0)}%</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">VAT (15%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {paidAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Amount Paid:</span>
                  <span>-{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Balance Due:</span>
                  <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="border-t pt-6 grid grid-cols-2 gap-8">
            {invoice.notes && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Notes</p>
                <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Terms & Conditions</p>
                <p className="text-slate-700 whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
