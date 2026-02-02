import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Package, Tag, BarChart3, MapPin, Barcode, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useItem, useDeleteItem } from '@/hooks/use-inventory'
import { formatCurrency } from '@/lib/utils'

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useItem(id || '')
  const deleteItem = useDeleteItem()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleConfirmDelete = async () => {
    await deleteItem.mutateAsync(id!)
    setShowDeleteConfirm(false)
    navigate('/dashboard/inventory')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Item Not Found</h2>
        <p className="text-muted-foreground mb-6">The inventory item you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/dashboard/inventory')}>Back to Inventory</Button>
      </div>
    )
  }

  const quantityOnHand = Number(item.quantityOnHand) || 0
  const reorderPoint = Number(item.reorderPoint) || 0
  const costPrice = Number(item.costPrice) || 0
  const sellingPrice = Number(item.sellingPrice) || 0
  const isLowStock = quantityOnHand <= reorderPoint && reorderPoint > 0

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/inventory')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{item.name}</h1>
              <Badge variant={item.isActive ? 'default' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {isLowStock ? (
                <Badge variant="destructive">Low Stock</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-1">
              SKU: {item.sku}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/dashboard/inventory/${item.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Deactivate
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will mark item "{item.name}" as inactive.
              It will no longer appear in selection lists for new invoices or transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{item.type || 'PRODUCT'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{item.category?.name || 'Uncategorized'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Unit of Measure</p>
                    <p className="font-medium">{item.unitOfMeasure || 'Each'}</p>
                  </div>
                </div>
                {item.barcode && (
                  <div className="flex items-start gap-3">
                    <Barcode className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Barcode</p>
                      <p className="font-medium font-mono">{item.barcode}</p>
                    </div>
                  </div>
                )}
                {item.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Warehouse Location</p>
                      <p className="font-medium">{item.location}</p>
                    </div>
                  </div>
                )}
                {item.weight && (
                  <div className="flex items-start gap-3">
                    <Scale className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{item.weight} {item.weightUnit || 'Kg'}</p>
                    </div>
                  </div>
                )}
              </div>

              {item.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cost Price</p>
                  <p className="text-xl font-bold">{formatCurrency(costPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Retail Price</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(sellingPrice)}</p>
                </div>
                {item.sellingPrice2 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Wholesale (Lvl 2)</p>
                    <p className="text-xl font-bold">{formatCurrency(Number(item.sellingPrice2))}</p>
                  </div>
                )}
                {item.sellingPrice3 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Distributor (Lvl 3)</p>
                    <p className="text-xl font-bold">{formatCurrency(Number(item.sellingPrice3))}</p>
                  </div>
                )}
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit Margin:</span>
                <span className="font-medium text-emerald-600">
                  {costPrice > 0 ? `${(((sellingPrice - costPrice) / costPrice) * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant={item.taxable !== false ? 'default' : 'secondary'}>
                  {item.taxable !== false ? 'Taxable (15% VAT)' : 'Non-Taxable'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Summary */}
          <Card className={isLowStock ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-emerald-50/50 dark:bg-emerald-950/20'}>
            <CardHeader>
              <CardTitle className="text-sm uppercase">Stock Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Quantity on Hand:</span>
                <span className={`text-3xl font-bold ${isLowStock ? 'text-red-600' : 'text-emerald-600'}`}>
                  {quantityOnHand}
                </span>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reorder Point:</span>
                  <span className="font-medium">{reorderPoint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reorder Qty:</span>
                  <span className="font-medium">{item.reorderQuantity || 0}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inventory Value:</span>
                <span className="font-bold">{formatCurrency(quantityOnHand * costPrice)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/dashboard/inventory/adjustments/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Adjust Stock
                </Button>
              </Link>
              <Link to={`/dashboard/purchases/orders/new?itemId=${item.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Create PO
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
