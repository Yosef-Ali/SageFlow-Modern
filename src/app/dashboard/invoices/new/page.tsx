import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { DashboardHeader } from '@/components/dashboard/header'

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        heading="Create Invoice"
        text="Create a new invoice for your customer"
      >
        <Link href="/dashboard/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </DashboardHeader>

      {/* Form */}
      <InvoiceForm />
    </div>
  )
}
