
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2, AlertCircle, X, Scan } from 'lucide-react'
import { AIAutoScan } from '@/components/ai/ai-auto-scan'
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
import { createCustomer } from '@/services/customer-service'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface InvoiceFormProps {
  invoice?: any // Existing invoice for editing
  onSuccess?: () => void
}

export function InvoiceForm({ invoice, onSuccess }: InvoiceFormProps) {
  const navigate = useNavigate()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useCustomersDropdown()
  const { user } = useAuth()
  const { toast } = useToast()

  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    total: 0,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [showAIScan, setShowAIScan] = useState(false)
  const [scannedCustomerName, setScannedCustomerName] = useState<string | null>(null)

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

  // Load existing invoice data or scanned data
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
    } else {
      // Check for scanned data from storage
      const stored = sessionStorage.getItem('scannedInvoiceData')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          
          if (data.date) form.setValue('date', new Date(data.date))
          if (data.dueDate) form.setValue('dueDate', new Date(data.dueDate))
          
          if (data.items && data.items.length > 0) {
            const formItems = data.items.map((item: any) => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              taxRate: (item.taxRate || data.taxRate) ? 
                ((item.taxRate || data.taxRate) > 1 ? (item.taxRate || data.taxRate) / 100 : (item.taxRate || data.taxRate)) : 
                ETHIOPIAN_VAT_RATE,
            }))
            form.setValue('items', formItems)
          }
          
          if (data.notes) form.setValue('notes', data.notes)

          // Handle scanned customer name from storage
          if (data.customerName) {
            setScannedCustomerName(data.customerName)
          }

          // Clear storage after using it
          sessionStorage.removeItem('scannedInvoiceData')
        } catch (e) {
          console.error('Failed to parse scanned invoice data', e)
        }
      }
    }
  }, [invoice, form])

  const onSubmit = async (data: InvoiceFormValues) => {
    setFormError(null) // Clear previous errors
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
          phone: '0900000000', // Placeholder
          billingAddress: {}, // Empty as it's optional in schema fields but required by object shape
          isActive: true,
          customerType: 'RETAIL',
          paymentTerms: 'NET_30',
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

      if (isEditing) {
        await updateInvoice.mutateAsync({ id: invoice.id, data: finalData })
      } else {
        await createInvoice.mutateAsync(finalData)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/dashboard/invoices')
      }
    } catch (error) {
      // Display error in the form banner
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setFormError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      // Scroll to top to show the error
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
      {/* Error Banner */}
      {formError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-destructive">Error</h4>
            <p className="text-destructive/80 text-sm mt-1">{formError}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-destructive/60 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* AI Auto-Scan Dialog */}
      <AIAutoScan
        open={showAIScan}
        onOpenChange={setShowAIScan}
        onScanComplete={(data) => {
          // Auto-fill form with scanned data
          if (data.date) form.setValue('date', new Date(data.date))
          if (data.dueDate) form.setValue('dueDate', new Date(data.dueDate))
          if (data.items && data.items.length > 0) {
            // Clear existing items and add scanned items
            const formItems = data.items.map((item: any) => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              taxRate: (item.taxRate || data.taxRate) ? 
                ((item.taxRate || data.taxRate) > 1 ? (item.taxRate || data.taxRate) / 100 : (item.taxRate || data.taxRate)) : 
                ETHIOPIAN_VAT_RATE,
            }))
            form.setValue('items', formItems)
          }
          if (data.notes) form.setValue('notes', data.notes)
          
          // Match customer by name if possible, or set scanned name for user to choose
          if (data.customerName) {
            const matchedCustomer = customers?.find(c => 
              c.name.toLowerCase().includes(data.customerName.toLowerCase())
            )
            if (matchedCustomer) {
              form.setValue('customerId', matchedCustomer.id)
              setScannedCustomerName(null)
            } else {
              setScannedCustomerName(data.customerName)
            }
          }
        }}
      />

      {/* Customer & Dates */}
      <div className="bg-card p-6 rounded-lg border space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Invoice Details</h3>
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAIScan(true)}
              className="gap-2"
            >
              <Scan className="h-4 w-4" />
              AI Scan Invoice
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Select */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select
              value={form.watch('customerId')}
              onValueChange={(value) => {
                form.setValue('customerId', value)
                setFormError(null) // Clear error when customer changes

                // Auto-calculate Due Date based on Terms (Peachtree Logic)
                const customer = customers?.find((c: any) => c.id === value)
                if (customer?.paymentTerms) {
                  const terms = customer.paymentTerms
                  const date = form.getValues('date') || new Date()
                  let daysToAdd = 30 // Default

                  if (terms === 'NET_60') daysToAdd = 60
                  else if (terms === 'NET_15') daysToAdd = 15
                  else if (terms === 'DUE_ON_RECEIPT') daysToAdd = 0

                  const dueDate = new Date(date)
                  dueDate.setDate(dueDate.getDate() + daysToAdd)
                  
                  form.setValue('dueDate', dueDate)
                  // If we had a terms field controlled by form, we'd set it here too
                  form.setValue('terms', `Payment due ${terms.replace('_', ' ')}`) 
                }
              }}
              disabled={customersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temp">--- Temporary / New Customer ---</SelectItem>
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
            {/* Credit Limit Info */}
            {form.watch('customerId') && (() => {
              const selectedCustomer = customers?.find((c: any) => c.id === form.watch('customerId'))
              if (selectedCustomer && Number(selectedCustomer.creditLimit) > 0) {
                const balance = Number(selectedCustomer.balance) || 0
                const limit = Number(selectedCustomer.creditLimit)
                const available = limit - balance
                const isNearLimit = available < limit * 0.2 // Less than 20% available
                return (
                  <div className={`text-xs mt-1 p-2 rounded ${isNearLimit ? 'bg-amber-500/10 text-amber-500' : 'bg-muted/50 text-muted-foreground'}`}>
                    Credit: ETB {balance.toLocaleString()} / {limit.toLocaleString()}
                    <span className={isNearLimit ? 'font-medium' : ''}>
                      {' '}(ETB {available.toLocaleString()} available)
                    </span>
                  </div>
                )
              }
              return null
            })()}
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
      <div className="bg-card p-6 rounded-lg border space-y-4">
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
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Description</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground w-24">Qty</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground w-32">Unit Price</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground w-24">VAT %</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground w-32">Total</th>
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
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT (15%):</span>
              <span>{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span className="text-emerald-500">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping & PO Info (Peachtree) */}
      <div className="bg-card p-6 rounded-lg border space-y-6">
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
      <div className="bg-card p-6 rounded-lg border space-y-6">
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
          onClick={() => navigate('/dashboard/invoices')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  )
}
