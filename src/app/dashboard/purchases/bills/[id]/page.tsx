import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getBill } from '@/app/actions/purchase-actions'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function BillDetailPage({ params }: { params: { id: string } }) {
  const result = await getBill(params.id)
  
  if (!result.success || !result.data) {
    notFound()
  }

  const bill = result.data
  const isOverdue = new Date(bill.dueDate) < new Date() && bill.status !== 'PAID'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchases/bills">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Bill #{bill.billNumber}</h1>
          <p className="text-muted-foreground">{bill.vendor.name}</p>
        </div>
        <div className="flex items-center gap-2">
            {bill.status !== 'PAID' && (
                <Link href={`/dashboard/purchases/bills/${bill.id}/pay`}>
                    <Button>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Record Payment
                    </Button>
                </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-card p-6 rounded-lg border space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="font-semibold">Bill Details</h3>
              <Badge variant={bill.status === 'PAID' ? 'secondary' : (isOverdue ? 'destructive' : 'default')}>
                  {bill.status}
              </Badge>
           </div>
           <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                  <p className="text-muted-foreground">Bill Date</p>
                  <p className="font-medium">{formatDate(new Date(bill.date))}</p>
              </div>
              <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(new Date(bill.dueDate))}</p>
              </div>
               <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{formatCurrency(Number(bill.totalAmount))}</p>
              </div>
              <div>
                  <p className="text-muted-foreground">Paid Amount</p>
                  <p className="font-medium text-emerald-500">{formatCurrency(Number(bill.paidAmount))}</p>
              </div>
           </div>
           {bill.purchaseOrder && (
             <div className="pt-4 border-t">
                 <p className="text-muted-foreground text-sm">Linked PO</p>
                 <Link href={`/dashboard/purchases/orders/${bill.purchaseOrder.id}`} className="text-emerald-500 hover:underline text-sm font-medium">
                    {bill.purchaseOrder.poNumber}
                 </Link>
             </div>
           )}
        </div>
 
        {/* Vendor Card */}
        <div className="bg-card p-6 rounded-lg border">
             <h3 className="font-semibold mb-4">Vendor Information</h3>
             <div className="space-y-2">
                 <p className="text-lg font-medium">{bill.vendor.name}</p>
                 <p className="text-sm text-muted-foreground">{bill.vendor.email}</p>
                 <p className="text-sm text-muted-foreground">{bill.vendor.phone}</p>
             </div>
        </div>
      </div>
      
      {/* Payments History */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-6 border-b">
             <h3 className="font-semibold">Payments</h3>
        </div>
        {bill.payments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No payments recorded yet.</div>
        ) : (
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="text-left py-3 px-6 font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-6 font-medium text-muted-foreground">Method</th>
                        <th className="text-left py-3 px-6 font-medium text-muted-foreground">Reference</th>
                        <th className="text-right py-3 px-6 font-medium text-muted-foreground">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {bill.payments.map((payment: any) => (
                        <tr key={payment.id}>
                            <td className="py-3 px-6">{formatDate(new Date(payment.paymentDate))}</td>
                            <td className="py-3 px-6">{payment.paymentMethod}</td>
                             <td className="py-3 px-6">{payment.reference || '-'}</td>
                            <td className="py-3 px-6 text-right font-medium">{formatCurrency(Number(payment.amount))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  )
}
