'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentEditForm } from '@/components/payments/payment-edit-form'
import { usePayment } from '@/hooks/use-payments'
import { DashboardHeader } from '@/components/dashboard/header'

interface EditPaymentPageProps {
  params: { id: string }
}

export default function EditPaymentPage({ params }: EditPaymentPageProps) {
  const { id } = params
  const { data: payment, isLoading, error } = usePayment(id)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        heading="Edit Payment"
        text="Update payment details"
      >
        <Link href={`/dashboard/payments/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </DashboardHeader>

      {/* Form */}
      <PaymentEditForm payment={payment} />
    </div>
  )
}
