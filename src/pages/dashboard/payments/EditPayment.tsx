import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PaymentEditForm } from '@/components/payments/payment-edit-form'
import { usePayment } from '@/hooks/use-payments'

export default function EditPaymentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: payment, isLoading, error } = usePayment(id || '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Payment</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load payment'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/dashboard/payments')}>
          Back to Payments
        </Button>
      </div>
    )
  }

  if (!payment) {
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
            <p className="text-muted-foreground">The payment could not be found.</p>
            <Button className="mt-4" onClick={() => navigate('/dashboard/payments')}>
              Back to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Transform the payment data for the form
  const paymentForForm = {
    id: payment.id,
    customerId: payment.customer_id,
    invoiceId: payment.invoice_id,
    amount: payment.amount,
    paymentDate: payment.payment_date,
    paymentMethod: payment.payment_method,
    reference: payment.reference,
    notes: payment.notes,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Payment</h1>
          <p className="text-muted-foreground mt-1">
            {payment.reference || `Payment ID: ${payment.id.slice(0, 8)}...`}
          </p>
        </div>
      </div>

      <PaymentEditForm
        payment={paymentForForm}
        onSuccess={() => navigate(`/dashboard/payments/${id}`)}
      />
    </div>
  )
}
