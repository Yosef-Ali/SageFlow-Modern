import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItemForm } from '@/components/inventory/item-form'
import { useItem } from '@/hooks/use-inventory'

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id || '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Item Not Found</h2>
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find the item you're looking for."}</p>
        <Button onClick={() => navigate('/dashboard/inventory')}>Back to Inventory</Button>
      </div>
    )
  }

  // Map DB fields to form fields
  const formItem = {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description,
    categoryId: item.category_id,
    unitOfMeasure: item.unit_of_measure || 'Each',
    type: item.type || 'PRODUCT',
    costPrice: item.cost_price,
    sellingPrice: item.selling_price,
    reorderPoint: item.reorder_point,
    reorderQuantity: item.reorder_quantity,
    quantityOnHand: item.quantity_on_hand,
    isActive: item.is_active,
    sellingPrice2: item.selling_price_2,
    sellingPrice3: item.selling_price_3,
    taxable: item.taxable,
    barcode: item.barcode,
    location: item.location,
    weight: item.weight,
    weightUnit: item.weight_unit,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Item</h1>
          <p className="text-muted-foreground mt-1">Update item: {item.name}</p>
        </div>
      </div>

      <ItemForm
        item={formItem}
        onSuccess={() => navigate(`/dashboard/inventory/${id}`)}
      />
    </div>
  )
}
