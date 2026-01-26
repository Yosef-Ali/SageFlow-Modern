import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VendorForm } from '@/components/vendors/vendor-form'
import { useVendor } from '@/hooks/use-vendors'

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: vendor, isLoading, error } = useVendor(id || '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Vendor Not Found</h2>
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find the vendor you're looking for."}</p>
        <Button onClick={() => navigate('/dashboard/vendors')}>Back to Vendors</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Vendor</h1>
          <p className="text-muted-foreground mt-1">Update vendor: {vendor.name}</p>
        </div>
      </div>

      <VendorForm
        vendor={vendor}
        onSuccess={() => navigate(`/dashboard/vendors/${id}`)}
      />
    </div>
  )
}
