import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceForm } from '@/components/invoices/invoice-form'

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
          <p className="text-slate-500">Create a new invoice for your customer</p>
        </div>
      </div>

      {/* Form */}
      <InvoiceForm />
    </div>
  )
}
