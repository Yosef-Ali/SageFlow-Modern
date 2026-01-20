'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoiceTable } from '@/components/invoices/invoice-table'
import { DashboardHeader } from '@/components/dashboard/header'
import { useInvoices } from '@/hooks/use-invoices'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AIAutoScan } from '@/components/ai/ai-auto-scan'
import { useState } from 'react'

function InvoiceListContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [isAutoScanOpen, setIsAutoScanOpen] = useState(false)

  const { data, isLoading, error } = useInvoices({
    search: search || undefined,
    status: status as any,
  })

  const handleScanComplete = (scannedData: any) => {
    // Store scanned data in session storage and redirect to new invoice page
    sessionStorage.setItem('scannedInvoiceData', JSON.stringify(scannedData))
    router.push('/dashboard/invoices/new')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        heading="Invoices"
        text="Create and manage customer invoices"
      >
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAutoScanOpen(true)}
            variant="outline"
          >
            <Scan className="h-4 w-4 mr-2" />
            AI Auto-Scan
          </Button>
          <Link href="/dashboard/invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
        <div className="flex items-center justify-center py-16 px-4">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">Error loading invoices</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      ) : (
        <>
          <InvoiceTable invoices={data?.invoices || []} isLoading={isLoading} />

          {/* Pagination Info */}
          {data && data.invoices.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing {data.invoices.length} of {data.total} invoices
              </p>
            </div>
          )}
        </>
      )}

      {/* AI Auto-Scan Dialog */}
      <AIAutoScan
        open={isAutoScanOpen}
        onOpenChange={setIsAutoScanOpen}
        onScanComplete={handleScanComplete}
      />
    </div>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <InvoiceListContent />
    </Suspense>
  )
}
