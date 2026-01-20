'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import {
  invoiceSchema,
  type InvoiceFormValues,
  calculateInvoiceTotals,
  ETHIOPIAN_VAT_RATE,
} from '@/lib/validations/invoice'
import { useCreateInvoice, useUpdateInvoice, useCustomersDropdown } from '@/hooks/use-invoices'
import { formatCurrency } from '@/lib/utils'

interface InvoiceFormProps {
  invoice?: any // Existing invoice for editing
  onSuccess?: () => void
}

export function InvoiceForm({ invoice, onSuccess }: InvoiceFormProps) {
  const router = useRouter()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const { data: customers, isLoading: customersLoading } = useCustomersDropdown()

  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    total: 0,
  })

  const isEditing = !!invoice

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      items: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: ETHIOPIAN_VAT_RATE,
        },
      ],
      notes: '',
      terms: 'Payment is due within 30 days of invoice date.',
      status: 'DRAFT',
      // Peachtree fields
      salesRepId: '',
      poNumber: '',
      shipMethod: '',
      dropShip: false,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchItems = form.watch('items')

  // Recalculate totals when items change
  useEffect(() => {
    const newTotals = calculateInvoiceTotals(watchItems || [])
    setTotals(newTotals)
  }, [watchItems])

  // Load existing invoice data
  useEffect(() => {
    if (invoice) {
      form.reset({
        customerId: invoice.customerId,
        date: new Date(invoice.date),
        dueDate: new Date(invoice.dueDate),
        items: invoice.items.map((item: any) => ({
          id: item.id,
          itemId: item.itemId,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
        })),
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        status: invoice.status,
        // Peachtree fields
        salesRepId: invoice.salesRepId || '',
        poNumber: invoice.poNumber || '',
        shipMethod: invoice.shipMethod || '',
        shipDate: invoice.shipDate ? new Date(invoice.shipDate) : undefined,
        dropShip: invoice.dropShip || false,
      })
    }
  }, [invoice, form])

  const onSubmit = async (data: InvoiceFormValues) => {
    try {
      if (isEditing) {
        await updateInvoice.mutateAsync({ id: invoice.id, data })
      } else {
        await createInvoice.mutateAsync(data)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/invoices')
      }
    } catch (error) {
      // Error handled by mutation hooks
    }
  }

  const handleAddItem = () => {
    append({
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: ETHIOPIAN_VAT_RATE,
    })
  }

  const isLoading = createInvoice.isPending || updateInvoice.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Customer & Dates */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Invoice Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Select */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select
              value={form.watch('customerId')}
              onValueChange={(value) => form.setValue('customerId', value)}
              disabled={customersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer: any) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.customerNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId && (
              <p className="text-sm text-red-500">{form.formState.errors.customerId.message}</p>
            )}
          </div>

          {/* Invoice Date */}
          <div className="space-y-2">
            <Label>Invoice Date *</Label>
            <Input
              type="date"
              value={form.watch('date')?.toISOString().split('T')[0]}
              onChange={(e) => form.setValue('date', new Date(e.target.value))}
            />
            {form.formState.errors.date && (
              <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={form.watch('dueDate')?.toISOString().split('T')[0]}
              onChange={(e) => form.setValue('dueDate', new Date(e.target.value))}
            />
            {form.formState.errors.dueDate && (
              <p className="text-sm text-red-500">{form.formState.errors.dueDate.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Description</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-24">Qty</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-32">Unit Price</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-24">VAT %</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-32">Total</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const item = watchItems?.[index]
                const lineSubtotal = (item?.quantity || 0) * (item?.unitPrice || 0)
                const lineTax = lineSubtotal * (item?.taxRate || ETHIOPIAN_VAT_RATE)
                const lineTotal = lineSubtotal + lineTax

                return (
                  <tr key={field.id} className="border-b">
                    <td className="py-2 px-2">
                      <Input
                        {...form.register(`items.${index}.description`)}
                        placeholder="Item description"
                        className="w-full"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                        className="text-right"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={((item?.taxRate || ETHIOPIAN_VAT_RATE) * 100).toFixed(0)}
                        onChange={(e) => form.setValue(`items.${index}.taxRate`, parseFloat(e.target.value) / 100)}
                        className="text-right"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-medium">
                      {formatCurrency(lineTotal)}
                    </td>
                    <td className="py-2 px-2">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {form.formState.errors.items && (
          <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
        )}

        {/* Totals */}
        <div className="flex justify-end pt-4 border-t">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal:</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">VAT (15%):</span>
              <span>{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span className="text-emerald-600">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping & PO Info (Peachtree) */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Shipping & PO Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>PO Number</Label>
            <Input
              {...form.register('poNumber')}
              placeholder="Customer Purchase Order #"
            />
          </div>
          <div className="space-y-2">
            <Label>Sales Rep ID</Label>
            <Input
              {...form.register('salesRepId')}
              placeholder="Employee ID"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Ship Method</Label>
            <Input
              {...form.register('shipMethod')}
              placeholder="e.g. Courier, Pickup, DHL"
            />
          </div>
          <div className="space-y-2">
            <Label>Ship Date</Label>
            <Input
              type="date"
              value={form.watch('shipDate')?.toISOString().split('T')[0] || ''}
              onChange={(e) => {
                const val = e.target.value ? new Date(e.target.value) : null
                form.setValue('shipDate', val)
              }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="dropShip"
            checked={form.watch('dropShip')}
            onCheckedChange={(checked) => form.setValue('dropShip', checked)}
          />
          <Label htmlFor="dropShip">Drop Ship (Ship directly from vendor)</Label>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Terms & Notes</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...form.register('notes')}
              placeholder="Notes to the customer (optional)"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea
              {...form.register('terms')}
              placeholder="Payment terms and conditions"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/invoices')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  )
}
