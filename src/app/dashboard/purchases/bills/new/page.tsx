import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { BillForm } from '@/components/purchases/bill-form'
import { getVendorsForDropdown, getOpenPurchaseOrdersForDropdown } from '@/app/actions/purchase-actions'

export default async function NewBillPage() {
  const [vendorsResult, posResult] = await Promise.all([
    getVendorsForDropdown(),
    getOpenPurchaseOrdersForDropdown()
  ])

  const vendors = vendorsResult.success && vendorsResult.data ? vendorsResult.data : []
  const openPOs = posResult.success && posResult.data ? posResult.data : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchases/bills">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <DashboardHeader
          heading="Enter Bill"
          text="Record a new vendor bill or convert a PO"
        />
      </div>

      <BillForm vendors={vendors} openPOs={openPOs} />
    </div>
  )
}
