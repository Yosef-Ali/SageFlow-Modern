import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { PurchaseOrderForm } from '@/components/purchases/purchase-order-form'
import { getVendorsForDropdown, getItemsForDropdown } from '@/app/actions/purchase-actions'

export default async function NewPurchaseOrderPage() {
  const [vendorsResult, itemsResult] = await Promise.all([
    getVendorsForDropdown(),
    getItemsForDropdown()
  ])

  const vendors = vendorsResult.success && vendorsResult.data ? vendorsResult.data : []
  const items = itemsResult.success && itemsResult.data ? itemsResult.data : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchases/orders">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <DashboardHeader
          heading="Create Purchase Order"
          text="Create a new purchase order for a vendor"
        />
      </div>

      <PurchaseOrderForm vendors={vendors} items={items} />
    </div>
  )
}
