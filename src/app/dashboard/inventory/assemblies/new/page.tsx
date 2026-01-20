import { DashboardHeader } from '@/components/dashboard/header'
import { AssemblyForm } from '@/components/inventory/assembly-form'
import { getItemsForDropdown } from '@/app/actions/purchase-actions'

export default async function NewAssemblyPage() {
  // Reuse the purchase action helper to get items, or create new one if needed features missing
  const { data: items } = await getItemsForDropdown()

  return (
    <div className="space-y-6">
      <DashboardHeader 
        heading="Create Assembly Definition" 
        text="Define the Bill of Materials for a buildable item."
      />
      
      <div className="grid gap-8">
        <AssemblyForm items={items || []} />
      </div>
    </div>
  )
}
