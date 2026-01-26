import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Receipt, Calendar, User, FileText, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { usePayment, useDeletePayment } from '@/hooks/use-payments'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getPaymentMethodLabel, paymentMethodColors } from '@/types/payment'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: payment, isLoading, error } = usePayment(id || '')
  const deletePayment = useDeletePayment()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    if (!id) return

    try {
      await deletePayment.mutateAsync(id)
      toast({
        title: 'Payment Deleted',
        description: 'The payment has been successfully deleted.',
      })
      navigate('/dashboard/payments')
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete payment',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Payment Not Found</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'The payment could not be found.'}
            </p>
            <Button className="mt-4" onClick={() => navigate('/dashboard/payments')}>
              Back to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const methodColors = paymentMethodColors[payment.payment_method] || { bg: 'bg-muted', text: 'text-muted-foreground' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Payment Details
            </h1>
            <p className="text-muted-foreground">
              {payment.reference || `Payment ID: ${payment.id.slice(0, 8)}...`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/dashboard/payments/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Payment Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Amount Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Received</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(Number(payment.amount))}</p>
            <Badge className={cn('mt-2', methodColors.bg, methodColors.text)}>
              {getPaymentMethodLabel(payment.payment_method)}
            </Badge>
          </CardContent>
        </Card>

        {/* Date Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payment Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatDate(new Date(payment.payment_date))}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Recorded on {formatDate(new Date(payment.created_at))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{payment.customer_id}</p>
            </div>
          </div>

          <Separator />

          {/* Invoice */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Applied to Invoice</p>
              {payment.invoice_id ? (
                <Link
                  to={`/dashboard/invoices/${payment.invoice_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  View Invoice
                </Link>
              ) : (
                <p className="font-medium text-muted-foreground">General payment (no invoice)</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Method */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium">{getPaymentMethodLabel(payment.payment_method)}</p>
            </div>
          </div>

          {/* Reference */}
          {payment.reference && (
            <>
              <Separator />
              <div className="flex items-start gap-4">
                <div className="p-2 bg-muted rounded-lg">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reference / Receipt Number</p>
                  <p className="font-medium font-mono">{payment.reference}</p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {payment.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{payment.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment of {formatCurrency(Number(payment.amount))}?
              This will also update the customer balance and invoice status. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePayment.isPending}
            >
              {deletePayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
