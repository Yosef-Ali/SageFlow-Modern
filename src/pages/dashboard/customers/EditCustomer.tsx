import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'
import { useCustomer } from '@/hooks/use-customers'

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: customer, isLoading, error } = useCustomer(id || '')
  const [open, setOpen] = useState(true)

  const handleClose = () => {
    setOpen(false)
    navigate(`/dashboard/customers/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find the customer you're looking for."}</p>
        <Button onClick={() => navigate('/dashboard/customers')}>Back to Customers</Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <CustomerFormDialog
        open={open}
        onOpenChange={(val) => {
          if (!val) handleClose()
        }}
        onClose={handleClose}
        customer={customer}
      />
    </div>
  )
}
