import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdjustmentForm } from '@/components/inventory/adjustment-form'
import { useItems } from '@/hooks/use-inventory'

export default function InventoryAdjustmentsPage() {
  const navigate = useNavigate()
  const { data: items, isLoading } = useItems()

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Inventory Adjustment</h1>
          <p className="text-muted-foreground mt-1">Record stock adjustments, shrinkage, or corrections</p>
        </div>
      </div>

      <AdjustmentForm items={items || []} />
    </div>
  )
}
