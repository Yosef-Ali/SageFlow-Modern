import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, FileText, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePurchaseOrders } from '@/hooks/use-purchases'
import { format } from 'date-fns'

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState('')
  const { data: orders, isLoading } = usePurchaseOrders()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Manage vendor orders</p>
        </div>
        <Link to="/dashboard/purchases/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">PO Number</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Vendor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Total</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
            ) : orders && orders.length > 0 ? (
              orders.map((po: any) => (
                <tr key={po.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-mono text-sm">{po.po_number}</td>
                  <td className="px-6 py-4">{format(new Date(po.date), 'MMM dd, yyyy')}</td>
                  <td className="px-6 py-4">{po.vendor?.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant={po.status === 'OPEN' ? 'default' : 'secondary'}>{po.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(po.total_amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/dashboard/purchases/orders/${po.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No purchase orders found</p>
                  <Link to="/dashboard/purchases/orders/new">
                    <Button variant="outline" className="mt-4">Create First Order</Button>
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
