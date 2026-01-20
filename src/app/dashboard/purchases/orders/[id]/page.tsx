import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Edit, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardHeader } from '@/components/dashboard/header'
import { getPurchaseOrder } from '@/app/actions/purchase-actions'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  const result = await getPurchaseOrder(params.id)
  
  if (!result.success || !result.data) {
    notFound()
  }

  const po = result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchases/orders">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{po.poNumber}</h1>
          <p className="text-muted-foreground">{po.vendor.name}</p>
        </div>
        <div className="flex items-center gap-2">
            {/* Future: Print/PDF */}
            <Button variant="outline" size="icon" disabled>
                <Printer className="w-4 h-4" />
            </Button>
            {po.status === 'DRAFT' && (
             <Link href={`/dashboard/purchases/orders/${po.id}/edit`}>
                <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                </Button>
             </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-card p-6 rounded-lg border space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="font-semibold">Purchase Order Details</h3>
              <Badge variant={po.status === 'OPEN' ? 'default' : 'secondary'}>
                  {po.status}
             </Badge>
           </div>
           <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(new Date(po.date))}</p>
              </div>
              <div>
                  <p className="text-muted-foreground">Expected Date</p>
                  <p className="font-medium">{po.expectedDate ? formatDate(new Date(po.expectedDate)) : '-'}</p>
              </div>
               <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium text-emerald-500">{formatCurrency(Number(po.totalAmount))}</p>
              </div>
           </div>
           {po.notes && (
             <div className="pt-4 border-t">
                 <p className="text-muted-foreground text-sm">Notes</p>
                 <p className="text-sm text-foreground/80">{po.notes}</p>
             </div>
           )}
        </div>
 
        {/* Vendor Card */}
        <div className="bg-card p-6 rounded-lg border">
             <h3 className="font-semibold mb-4">Vendor Information</h3>
             <div className="space-y-2">
                 <p className="text-lg font-medium">{po.vendor.name}</p>
                 <p className="text-sm text-muted-foreground">{po.vendor.email}</p>
                 <p className="text-sm text-muted-foreground">{po.vendor.phone}</p>
             </div>
        </div>
      </div>
 
      {/* Items Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-6 border-b">
             <h3 className="font-semibold">Line Items</h3>
        </div>
        <table className="w-full text-sm">
            <thead className="bg-muted/50">
                <tr>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Item</th>
                    <th className="text-right py-3 px-6 font-medium text-muted-foreground">Quantity</th>
                    <th className="text-right py-3 px-6 font-medium text-muted-foreground">Unit Cost</th>
                    <th className="text-right py-3 px-6 font-medium text-muted-foreground">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {po.items.map((item: any) => (
                    <tr key={item.id}>
                        <td className="py-3 px-6">
                            <p className="font-medium">{item.item.name}</p>
                            <p className="text-muted-foreground text-xs">{item.description}</p>
                        </td>
                        <td className="py-3 px-6 text-right">{Number(item.quantity)}</td>
                        <td className="py-3 px-6 text-right">{formatCurrency(Number(item.unitCost))}</td>
                        <td className="py-3 px-6 text-right">{formatCurrency(Number(item.total))}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  )
}
