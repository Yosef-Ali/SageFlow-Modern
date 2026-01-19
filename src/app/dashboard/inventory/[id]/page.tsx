'use client'

import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useItem, useDeleteItem } from '@/hooks/use-inventory'
import { formatCurrency } from '@/lib/utils'

interface ItemDetailPageProps {
  params: { id: string }
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = params
  const router = useRouter()
  const { data: item, isLoading, error } = useItem(id)
  const deleteItem = useDeleteItem()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem.mutateAsync(id)
      router.push('/dashboard/inventory')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Item not found</p>
          <Link href="/dashboard/inventory">
            <Button variant="outline">Back to Inventory</Button>
          </Link>
        </div>
      </div>
    )
  }

  const qty = Number(item.quantityOnHand)
  const reorder = Number(item.reorderPoint)
  const stockStatus = qty === 0 
    ? { label: 'Out of Stock', color: 'bg-red-100 text-red-700' }
    : qty <= reorder 
      ? { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' }
      : { label: 'In Stock', color: 'bg-green-100 text-green-700' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventory">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
              {!item.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-slate-500">SKU: {item.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/inventory/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Type</p>
              <Badge variant="outline">{item.type}</Badge>
            </div>
            <div>
              <p className="text-sm text-slate-500">Category</p>
              <p className="font-medium">{item.category?.name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Unit of Measure</p>
              <p className="font-medium">{item.unitOfMeasure}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                {stockStatus.label}
              </span>
            </div>
          </div>

          {item.description && (
            <div>
              <p className="text-sm text-slate-500">Description</p>
              <p className="font-medium">{item.description}</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h3 className="text-lg font-semibold">Pricing & Inventory</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Cost Price</p>
              <p className="text-xl font-bold">{formatCurrency(Number(item.costPrice))}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Selling Price</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(Number(item.sellingPrice))}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Quantity on Hand</p>
              <p className="text-xl font-bold">{qty} {item.unitOfMeasure}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Reorder Point</p>
              <p className="font-medium">{reorder} {item.unitOfMeasure}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Reorder Quantity</p>
              <p className="font-medium">{Number(item.reorderQuantity)} {item.unitOfMeasure}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Value</p>
              <p className="font-medium">{formatCurrency(qty * Number(item.costPrice))}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
