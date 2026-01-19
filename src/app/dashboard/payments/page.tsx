'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentTable } from '@/components/payments/payment-table'
import { usePayments } from '@/hooks/use-payments'
import { DashboardHeader } from '@/components/dashboard/header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { paymentMethods } from '@/lib/validations/payment'
import { AIPaymentScan } from '@/components/ai/ai-payment-scan'

function PaymentListContent() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('all')
  const [isAutoScanOpen, setIsAutoScanOpen] = useState(false)

  const { data, isLoading, error } = usePayments({
    search: search || undefined,
    paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
  })

  const handleScanComplete = (scannedData: any) => {
    sessionStorage.setItem('scannedPaymentData', JSON.stringify(scannedData))
    router.push('/dashboard/payments/new')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        heading="Payments"
        text="Record and track customer payments"
      >
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAutoScanOpen(true)}
            variant="outline"
          >
            <Scan className="h-4 w-4 mr-2" />
            AI Auto-Scan
          </Button>
          <Link href="/dashboard/payments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search payments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Payment Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {paymentMethods.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">Error loading payments</p>
            <p className="text-sm text-slate-500">{error.message}</p>
          </div>
        </div>
      ) : (
        <>
          <PaymentTable payments={data?.payments || []} isLoading={isLoading} />
          
          {data && data.payments.length > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <p>Showing {data.payments.length} of {data.total} payments</p>
            </div>
          )}
        </>
      )}

      {/* AI Auto-Scan Dialog */}
      <AIPaymentScan
        open={isAutoScanOpen}
        onOpenChange={setIsAutoScanOpen}
        onScanComplete={handleScanComplete}
      />
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <PaymentListContent />
    </Suspense>
  )
}
