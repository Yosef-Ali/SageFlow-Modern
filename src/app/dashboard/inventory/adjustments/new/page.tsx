import { DashboardHeader } from '@/components/dashboard/header'
import { AdjustmentForm } from '@/components/inventory/adjustment-form'
import { getItemsForDropdown } from '@/app/actions/purchase-actions'

export default async function NewAdjustmentPage() {
  const result = await getItemsForDropdown()
  const items = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <DashboardHeader 
        heading="Record Stock Adjustment" 
        text="Manually adjust inventory quantities for damage, loss, or corrections."
      />
      
      <div className="grid gap-8">
        <AdjustmentForm items={items || []} />
      </div>
    </div>
  )
}
