'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentTable } from '@/components/payments/payment-table'
import { usePayments } from '@/hooks/use-payments'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { paymentMethods } from '@/lib/validations/payment'

function PaymentListContent() {
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('all')

  const { data, isLoading, error } = usePayments({
    search: search || undefined,
    paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-slate-500">Record and track customer payments</p>
        </div>
        <Link href="/payments/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </Link>
      </div>

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
