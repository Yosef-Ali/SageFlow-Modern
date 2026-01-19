'use client'

import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/header'
import { VendorForm } from '@/components/vendors/vendor-form'
import { useVendor } from '@/hooks/use-vendors'
import { Loader2 } from 'lucide-react'

export default function EditVendorPage() {
  const params = useParams()
  const id = params.id as string
  const { data: vendor, isLoading } = useVendor(id)

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Vendor not found.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader
        heading="Edit Vendor"
        text={`Update information for ${vendor.name}`}
      />
      <div className="grid gap-4">
        <VendorForm vendor={vendor} />
      </div>
    </div>
  )
}
