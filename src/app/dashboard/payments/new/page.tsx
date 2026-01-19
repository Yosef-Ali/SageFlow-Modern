import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PaymentForm } from '@/components/payments/payment-form'
import { DashboardHeader } from '@/components/dashboard/header'

export default function NewPaymentPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        heading="Record Payment"
        text="Record a new customer payment"
      >
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </DashboardHeader>

      {/* Form */}
      <PaymentForm />
    </div>
  )
}
