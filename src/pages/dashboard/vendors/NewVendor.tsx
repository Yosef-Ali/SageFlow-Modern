import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VendorForm } from '@/components/vendors/vendor-form'

export default function NewVendorPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Vendor</h1>
          <p className="text-muted-foreground mt-1">Add a new supplier or vendor</p>
        </div>
      </div>

      <VendorForm />
    </div>
  )
}
