import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PurchaseOrderForm } from '@/components/purchases/purchase-order-form'
import { useVendors } from '@/hooks/use-vendors'
import { useItems } from '@/hooks/use-inventory'

export default function NewPurchaseOrderPage() {
  const navigate = useNavigate()
  const { data: vendors, isLoading: vendorsLoading } = useVendors()
  const { data: items, isLoading: itemsLoading } = useItems()

  if (vendorsLoading || itemsLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Purchase Order</h1>
          <p className="text-muted-foreground mt-1">Create a new purchase order for a vendor</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <PurchaseOrderForm 
          vendors={vendors || []} 
          items={items || []} 
        />
      </div>
    </div>
  )
}
