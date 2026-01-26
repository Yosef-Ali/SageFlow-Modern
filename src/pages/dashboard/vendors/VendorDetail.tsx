import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Building2, CreditCard, FileText } from 'lucide-react'
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
import { useVendor, useDeleteVendor } from '@/hooks/use-vendors'
import { formatCurrency } from '@/lib/utils'

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: vendor, isLoading, error } = useVendor(id || '')
  const deleteVendor = useDeleteVendor()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleConfirmDelete = async () => {
    await deleteVendor.mutateAsync(id!)
    setShowDeleteConfirm(false)
    navigate('/dashboard/vendors')
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

  if (error || !vendor) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Vendor Not Found</h2>
        <p className="text-muted-foreground mb-6">The vendor you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/dashboard/vendors')}>Back to Vendors</Button>
      </div>
    )
  }

  const address = vendor.address as any
  const balance = Number(vendor.balance) || 0
  const creditLimit = Number(vendor.creditLimit) || 0

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/vendors')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{vendor.name}</h1>
              <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Vendor #{vendor.vendorNumber || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/dashboard/vendors/${vendor.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete vendor "{vendor.name}"
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendor.contactName && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{vendor.contactName}</p>
                    </div>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{vendor.email}</p>
                    </div>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{vendor.phone}</p>
                    </div>
                  </div>
                )}
                {vendor.taxId && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">TIN (Tax ID)</p>
                      <p className="font-medium">{vendor.taxId}</p>
                    </div>
                  </div>
                )}
              </div>

              {address && (address.street || address.city) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {address.street && <span>{address.street}<br /></span>}
                        {address.city && <span>{address.city}, </span>}
                        {address.state && <span>{address.state} </span>}
                        {address.zip && <span>{address.zip}</span>}
                        {address.country && <><br />{address.country}</>}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Type</p>
                  <p className="font-medium">{vendor.vendorType || 'SUPPLIER'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{vendor.paymentTerms || 'NET_30'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credit Limit</p>
                  <p className="font-medium">{formatCurrency(creditLimit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Discount</p>
                  <p className="font-medium">{vendor.discountPercent || 0}%</p>
                </div>
              </div>

              {vendor.taxExempt && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    VAT Exempt - Certificate #{vendor.taxExemptNumber || 'N/A'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {vendor.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Balance Summary */}
          <Card className={balance > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'bg-emerald-50/50 dark:bg-emerald-950/20'}>
            <CardHeader>
              <CardTitle className="text-sm uppercase">Account Payable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Amount Owed:</span>
                <span className={`text-2xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(balance)}
                </span>
              </div>
              {creditLimit > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Credit Limit:</span>
                    <span className="font-medium">{formatCurrency(creditLimit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Available Credit:</span>
                    <span className="font-medium">{formatCurrency(Math.max(0, creditLimit - balance))}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={`/dashboard/purchases/orders/new?vendorId=${vendor.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              </Link>
              <Link to={`/dashboard/purchases/bills/new?vendorId=${vendor.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Create Bill
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
