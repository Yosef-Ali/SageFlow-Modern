'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomerTable } from '@/components/customers/customer-table'
import { CustomerFilters } from '@/components/customers/customer-filters'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { useCustomers } from '@/hooks/use-customers'
import { useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

export default function CustomersPage() {
  const searchParams = useSearchParams()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const filters = {
    search: searchParams.get('search') || undefined,
    status: (searchParams.get('status') as 'active' | 'inactive' | 'all') || 'active',
  }

  const { data, isLoading, error } = useCustomers(filters)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-slate-500">Manage your customer database</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <CustomerFilters />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">Error loading customers</p>
            <p className="text-sm text-slate-500">{error.message}</p>
          </div>
        </div>
      ) : (
        <>
          <CustomerTable customers={data?.customers || []} isLoading={isLoading} />

          {/* Pagination Info */}
          {data && data.customers.length > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <p>
                Showing {data.customers.length} of {data.total} customers
              </p>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <CustomerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  )
}
