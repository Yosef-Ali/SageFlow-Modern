import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BillForm } from '@/components/purchases/bill-form'
import { useVendors } from '@/hooks/use-vendors'
import { usePurchaseOrders } from '@/hooks/use-purchases'

export default function NewBillPage() {
  const navigate = useNavigate()
  const { data: vendors, isLoading: vendorsLoading } = useVendors()
  // Fetch active/open purchase orders to link
  const { data: purchaseOrders, isLoading: posLoading } = usePurchaseOrders({ status: 'OPEN' })

  if (vendorsLoading || posLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Bill</h1>
          <p className="text-muted-foreground mt-1">Record a new vendor bill</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <BillForm 
          vendors={vendors || []} 
          openPOs={purchaseOrders || []} 
        />
      </div>
    </div>
  )
}
