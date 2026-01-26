
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Scan } from 'lucide-react'
import { AIPaymentScan } from '@/components/ai/ai-payment-scan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  paymentSchema,
  paymentMethods,
  type PaymentFormValues,
} from '@/lib/validations/payment'
import { useCreatePayment, useUnpaidInvoices } from '@/hooks/use-payments'
import { useCustomersDropdown } from '@/hooks/use-invoices'
import { createCustomer } from '@/services/customer-service'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface PaymentFormProps {
  preselectedInvoiceId?: string
  preselectedCustomerId?: string
  preselectedAmount?: number
  onSuccess?: () => void
}

export function PaymentForm({
  preselectedInvoiceId,
  preselectedCustomerId,
  preselectedAmount,
  onSuccess,
}: PaymentFormProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const createPayment = useCreatePayment()
  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useCustomersDropdown()

  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '')
  const [showPaymentScan, setShowPaymentScan] = useState(false)
  const [scannedCustomerName, setScannedCustomerName] = useState<string | null>(null)
  const { data: unpaidInvoices } = useUnpaidInvoices(selectedCustomerId)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: preselectedCustomerId || '',
      invoiceId: preselectedInvoiceId || undefined,
      amount: preselectedAmount || 0,
      paymentDate: new Date(),
      paymentMethod: '',
      reference: '',
      notes: '',
    },
  })

  // Update form when preselected values change
  useEffect(() => {
    if (preselectedCustomerId) {
      form.setValue('customerId', preselectedCustomerId)
      setSelectedCustomerId(preselectedCustomerId)
    }
    if (preselectedInvoiceId) {
      form.setValue('invoiceId', preselectedInvoiceId)
    }
    if (preselectedAmount) {
      form.setValue('amount', preselectedAmount)
    }
  }, [preselectedCustomerId, preselectedInvoiceId, preselectedAmount, form])

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId)
    form.setValue('customerId', customerId)
    form.setValue('invoiceId', undefined) // Reset invoice selection
  }

  const handleInvoiceChange = (invoiceId: string) => {
    const value = invoiceId === 'none' ? undefined : invoiceId
    form.setValue('invoiceId', value)
    
    // Auto-fill remaining balance
    if (value) {
      const invoice = unpaidInvoices?.find((inv: any) => inv.id === value)
      if (invoice) {
        const remaining = Number(invoice.total) - Number(invoice.paidAmount)
        form.setValue('amount', remaining)
      }
    }
  }

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      let finalData = { ...data }

      // Handle temporary customer creation
      if (data.customerId === 'temp') {
        if (!scannedCustomerName) {
          throw new Error('Please enter a name for the new customer')
        }
        if (!user?.companyId) throw new Error('Not authenticated')

        const newCustomerResult = await createCustomer(user.companyId, {
          name: scannedCustomerName,
          email: '',
          phone: '',
          billingAddress: {}, 
          isActive: true,
          customerType: 'RETAIL',
          paymentTerms: 'DUE_ON_RECEIPT',
          discountPercent: 0,
          taxExempt: false,
          priceLevel: '1',
          openingBalance: 0,
        })

        if (!newCustomerResult.success || !newCustomerResult.data) {
          throw new Error(`Failed to create new customer: ${newCustomerResult.error || 'Unknown error'}`)
        }

        finalData.customerId = newCustomerResult.data.id
        await refetchCustomers() // Update local list
      }

      await createPayment.mutateAsync(finalData)
      // Toast is handled by the mutation hook
      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/dashboard/payments')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record payment',
        variant: 'destructive',
      })
    }
  }

  const handleScanComplete = (data: any) => {
    if (data.amount) form.setValue('amount', data.amount)
    if (data.paymentDate) form.setValue('paymentDate', new Date(data.paymentDate))
    
    if (data.paymentMethod) {
      // Map extracted method to allowed values (must be lowercase)
      const method = data.paymentMethod.toLowerCase().replace(' ', '_')
      form.setValue('paymentMethod', method)
    } else {
      // Default to cash if not found (lowercase to match validation)
      form.setValue('paymentMethod', 'cash')
    }
    
    if (data.reference) form.setValue('reference', data.reference)
    if (data.notes) form.setValue('notes', data.notes)

    // Handle scanned customer/payee name
    if (data.customerName || data.payeeName || data.receivedFrom) {
       // Normalize field options from scanner
       const name = data.customerName || data.payeeName || data.receivedFrom
       
       const matchedCustomer = customers?.find((c: any) => 
          c.name.toLowerCase().includes(name.toLowerCase())
       )

       if (matchedCustomer) {
          handleCustomerChange(matchedCustomer.id)
          setScannedCustomerName(null)
       } else {
          setScannedCustomerName(name)
          // Don't auto-set 'temp' to avoid confusion, but show banner
       }
    }
  }

  const isLoading = createPayment.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* AI Payment Scan Dialog */}
      <AIPaymentScan
        open={showPaymentScan}
        onOpenChange={setShowPaymentScan}
        onScanComplete={handleScanComplete}
      />

      {/* Customer & Invoice Selection */}
      <div className="bg-card p-6 rounded-lg border space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Payment Details</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPaymentScan(true)}
            className="gap-2"
          >
            <Scan className="h-4 w-4" />
            AI Scan Receipt
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Select */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select
              value={form.watch('customerId')}
              onValueChange={handleCustomerChange}
              disabled={customersLoading || !!preselectedCustomerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temp">--- Temporary / New Customer ---</SelectItem>
                {customers?.map((customer: any) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId && (
              <p className="text-sm text-red-500">{form.formState.errors.customerId.message}</p>
            )}

            {/* Scanned Customer Notification */}
            {scannedCustomerName && !form.watch('customerId') && (
              <div className="text-xs mt-1 p-2 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">
                AI extracted: <strong>"{scannedCustomerName}"</strong>. 
                Please select an existing customer or use "Temporary Customer".
              </div>
            )}
            
            {form.watch('customerId') === 'temp' && (
              <div className="space-y-2 mt-4">
                <Label>Temporary Customer Name *</Label>
                <Input 
                  placeholder="Enter customer name"
                  value={scannedCustomerName || ''}
                  onChange={(e) => setScannedCustomerName(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">Note: This will not be saved to your permanent customer list.</p>
              </div>
            )}
          </div>

          {/* Invoice Select (Optional) */}
          <div className="space-y-2">
            <Label>Apply to Invoice</Label>
            <Select
              value={form.watch('invoiceId') || 'none'}
              onValueChange={handleInvoiceChange}
              disabled={!selectedCustomerId || !!preselectedInvoiceId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an invoice (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No invoice (general payment)</SelectItem>
                {unpaidInvoices?.map((invoice: any) => {
                  const remaining = Number(invoice.total) - Number(invoice.paidAmount)
                  return (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} — Balance: {formatCurrency(remaining)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (ETB) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Input
              type="date"
              value={form.watch('paymentDate')?.toISOString().split('T')[0]}
              onChange={(e) => form.setValue('paymentDate', new Date(e.target.value))}
            />
            {form.formState.errors.paymentDate && (
              <p className="text-sm text-red-500">{form.formState.errors.paymentDate.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select
              value={form.watch('paymentMethod')}
              onValueChange={(value) => form.setValue('paymentMethod', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.paymentMethod && (
              <p className="text-sm text-red-500">{form.formState.errors.paymentMethod.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reference */}
          <div className="space-y-2">
            <Label>Reference / Transaction ID</Label>
            <Input
              {...form.register('reference')}
              placeholder="e.g., Bank transfer reference"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...form.register('notes')}
              placeholder="Additional payment notes"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard/payments')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Record Payment
        </Button>
      </div>
    </form>
  )
}
