'use client'


import Link from 'next/link'
import { ArrowLeft, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePayment, useDeletePayment } from '@/hooks/use-payments'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getPaymentMethodLabel, paymentMethodColors } from '@/types/payment'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface PaymentDetailPageProps {
  params: { id: string }
}

export default function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const { id } = params
  const router = useRouter()
  const { data: payment, isLoading, error } = usePayment(id)
  const deletePayment = useDeletePayment()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this payment?')) {
      await deletePayment.mutateAsync(id)
      router.push('/payments')
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

  if (error || !payment) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Payment not found</p>
          <Link href="/dashboard/payments">
            <Button variant="outline">Back to Payments</Button>
          </Link>
        </div>
      </div>
    )
  }

  const methodColors = paymentMethodColors[payment.paymentMethod] || { bg: 'bg-slate-100', text: 'text-slate-700' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Details</h1>
            <p className="text-slate-500">
              Recorded on {formatDate(new Date(payment.createdAt))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/payments/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Payment
          </Button>
        </div>
      </div>

      {/* Payment Details Card */}
      <div className="bg-white p-8 rounded-lg border border-slate-200 space-y-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Amount</p>
              <p className="text-3xl font-bold text-emerald-600">
                {formatCurrency(Number(payment.amount))}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Payment Date</p>
              <p className="font-medium">{formatDate(new Date(payment.paymentDate))}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Payment Method</p>
              <span className={cn('inline-flex px-3 py-1 rounded-full text-sm font-medium', methodColors.bg, methodColors.text)}>
                {getPaymentMethodLabel(payment.paymentMethod)}
              </span>
            </div>

            {payment.reference && (
              <div>
                <p className="text-sm text-slate-500">Reference</p>
                <p className="font-mono">{payment.reference}</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Customer</p>
              <p className="font-semibold text-lg">{payment.customer?.name}</p>
              {payment.customer?.email && (
                <p className="text-slate-600">{payment.customer.email}</p>
              )}
            </div>

            {payment.invoice && (
              <div>
                <p className="text-sm text-slate-500">Applied to Invoice</p>
                <Link
                  href={`/invoices/${payment.invoice.id}`}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  {payment.invoice.invoiceNumber}
                </Link>
              </div>
            )}

            {payment.notes && (
              <div>
                <p className="text-sm text-slate-500">Notes</p>
                <p className="text-slate-700 whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
