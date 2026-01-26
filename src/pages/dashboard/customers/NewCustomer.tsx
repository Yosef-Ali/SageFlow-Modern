import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog'

export default function NewCustomerPage() {
  const navigate = useNavigate()
  // Always open since we are on the /new route
  const [open, setOpen] = useState(true)

  const handleClose = () => {
    setOpen(false)
    // Navigate back to customers list on close
    navigate('/dashboard/customers')
  }

  return (
    <div className="p-6">
      {/* 
        We render the dialog controlled by state. 
        When 'open' becomes false, we navigate away.
      */}
      <CustomerFormDialog
        open={open}
        onOpenChange={(val) => {
          if (!val) handleClose()
        }}
        onClose={handleClose}
        customer={null}
      />
    </div>
  )
}
