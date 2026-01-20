import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { PurchaseOrderTable } from '@/components/purchases/purchase-order-table'
import { getPurchaseOrders } from '@/app/actions/purchase-actions'

export default async function PurchaseOrdersPage() {
  const { data, success } = await getPurchaseOrders()
  const purchaseOrders = success && data ? data.purchaseOrders : []

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Purchase Orders"
        text="Manage your purchase orders and procurement"
      >
        <Link href="/dashboard/purchases/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Order
          </Button>
        </Link>
      </DashboardHeader>

      <PurchaseOrderTable purchaseOrders={purchaseOrders} />
    </div>
  )
}
