'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { useUpdatePayment, useUnpaidInvoices } from '@/hooks/use-payments'
import { useCustomersDropdown } from '@/hooks/use-invoices'
import { formatCurrency } from '@/lib/utils'

interface PaymentEditFormProps {
  payment: any
  onSuccess?: () => void
}

export function PaymentEditForm({ payment, onSuccess }: PaymentEditFormProps) {
  const router = useRouter()
  const updatePayment = useUpdatePayment()
  const { data: customers, isLoading: customersLoading } = useCustomersDropdown()

  const [selectedCustomerId, setSelectedCustomerId] = useState(payment.customerId || '')
  const { data: unpaidInvoices } = useUnpaidInvoices(selectedCustomerId)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: payment.customerId || '',
      invoiceId: payment.invoiceId || undefined,
      amount: Number(payment.amount) || 0,
      paymentDate: new Date(payment.paymentDate),
      paymentMethod: payment.paymentMethod || '',
      reference: payment.reference || '',
      notes: payment.notes || '',
    },
  })

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId)
    form.setValue('customerId', customerId)
    form.setValue('invoiceId', undefined)
  }

  const handleInvoiceChange = (invoiceId: string) => {
    const value = invoiceId === 'none' ? undefined : invoiceId
    form.setValue('invoiceId', value)
  }

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      await updatePayment.mutateAsync({ id: payment.id, data })
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/dashboard/payments/${payment.id}`)
      }
    } catch (error) {
      // Error handled by mutation hook
    }
  }

  const isLoading = updatePayment.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Customer & Invoice Selection */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Payment Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Select */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select
              value={form.watch('customerId')}
              onValueChange={handleCustomerChange}
              disabled={customersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
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
          </div>

          {/* Invoice Select (Optional) */}
          <div className="space-y-2">
            <Label>Apply to Invoice</Label>
            <Select
              value={form.watch('invoiceId') || 'none'}
              onValueChange={handleInvoiceChange}
              disabled={!selectedCustomerId}
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
          onClick={() => router.push(`/dashboard/payments/${payment.id}`)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Update Payment
        </Button>
      </div>
    </form>
  )
}
