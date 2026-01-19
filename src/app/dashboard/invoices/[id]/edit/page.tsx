'use client'


import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { useInvoice } from '@/hooks/use-invoices'
import { DashboardHeader } from '@/components/dashboard/header'

interface EditInvoicePageProps {
  params: { id: string }
}

export default function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = params
  const { data: invoice, isLoading, error } = useInvoice(id)

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
          <Link href="/dashboard/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Prevent editing non-draft invoices
  if (!['DRAFT'].includes(invoice.status)) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-amber-600 font-medium mb-2">This invoice cannot be edited</p>
          <p className="text-slate-500 mb-4">Only draft invoices can be modified</p>
          <Link href={`/dashboard/invoices/${id}`}>
            <Button variant="outline">View Invoice</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        heading="Edit Invoice"
        text={`Editing ${invoice.invoiceNumber}`}
      >
        <Link href={`/dashboard/invoices/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </DashboardHeader>

      {/* Form */}
      <InvoiceForm invoice={invoice} />
    </div>
  )
}
