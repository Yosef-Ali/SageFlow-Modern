'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { VendorForm } from '@/components/vendors/vendor-form'

export default function NewVendorPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader
        heading="New Vendor"
        text="Add a new vendor to your records."
      />
      <div className="grid gap-4">
        <VendorForm />
      </div>
    </div>
  )
}
