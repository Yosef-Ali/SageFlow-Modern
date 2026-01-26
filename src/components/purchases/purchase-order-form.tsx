
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  purchaseOrderSchema,
  type PurchaseFormValues,
  calculatePOTotals,
} from '@/lib/validations/purchase'
import { createPurchaseOrder } from '@/app/actions/purchase-actions'

interface PurchaseOrderFormProps {
  vendors: any[]
  items: any[]
}

export function PurchaseOrderForm({ vendors, items }: PurchaseOrderFormProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totals, setTotals] = useState({ total: 0 })

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      vendorId: '',
      date: new Date(),
      status: 'DRAFT',
      items: [
        {
          itemId: '',
          description: '',
          quantity: 1,
          unitCost: 0,
        },
      ],
      notes: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const watchItems = form.watch('items')

  // Recalculate totals
  useEffect(() => {
    // We need to cast because RHF might give partial values during typing
    const currentItems = (watchItems || []) as any[]
    // Ensure all required fields for calc are present or default to 0
    const safeItems = currentItems.map(i => ({
      itemId: i.itemId || '',
      quantity: Number(i.quantity) || 0,
      unitCost: Number(i.unitCost) || 0,
    }))
    
    const newTotals = calculatePOTotals(safeItems)
    setTotals(newTotals)
  }, [watchItems])

  const onSubmit = async (data: PurchaseFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createPurchaseOrder(data)
      if (result.success) {
         toast({
            title: 'Success',
            description: 'Purchase Order created successfully',
         })
         navigate('/dashboard/purchases/orders')
      } else {
         toast({
            title: 'Error',
            description: result.error || 'Failed to create PO',
            variant: 'destructive',
         })
      }
    } catch (error) {
      console.error(error)
       toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = items.find(i => i.id === itemId)
    if (selectedItem) {
      form.setValue(`items.${index}.itemId`, itemId)
      form.setValue(`items.${index}.description`, selectedItem.name)
      form.setValue(`items.${index}.unitCost`, Number(selectedItem.unitCost || 0)) // costPrice mapped to unitCost
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-card p-6 rounded-lg border space-y-6">
        <h3 className="text-lg font-semibold">Purchase Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Vendor */}
          <div className="space-y-2">
            <Label>Vendor *</Label>
            <Select
              onValueChange={(value) => form.setValue('vendorId', value)}
              defaultValue={form.getValues('vendorId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.vendorId && (
              <p className="text-sm text-red-500">{form.formState.errors.vendorId.message}</p>
            )}
          </div>

            {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.watch('date') ? new Date(form.watch('date')).toISOString().split('T')[0] : ''}
              onChange={(e) => form.setValue('date', new Date(e.target.value))}
            />
          </div>
          
           {/* Expected Date */}
           <div className="space-y-2">
            <Label>Expected Date</Label>
            <Input
              type="date"
              value={form.watch('expectedDate') ? new Date(form.watch('expectedDate')!).toISOString().split('T')[0] : ''}
              onChange={(e) => form.setValue('expectedDate', new Date(e.target.value))}
            />
          </div>

        </div>
      </div>

       {/* Items */}
       <div className="bg-card p-6 rounded-lg border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Items</h3>
           <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', description: '', quantity: 1, unitCost: 0 })}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
        
         <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                 <th className="text-left py-3 px-2 text-sm font-medium text-slate-500 w-1/4">Item</th>
                 <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Description</th>
                 <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-24">Qty</th>
                 <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-32">Unit Cost</th>
                 <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-32">Total</th>
                 <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                 const quantity = Number(form.watch(`items.${index}.quantity`) || 0)
                 const unitCost = Number(form.watch(`items.${index}.unitCost`) || 0)
                 const total = quantity * unitCost

                 return (
                <tr key={field.id} className="border-b">
                  <td className="py-2 px-2">
                     <Select
                        onValueChange={(val) => handleItemSelect(index, val)}
                        defaultValue={form.watch(`items.${index}.itemId`)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </td>
                  <td className="py-2 px-2">
                    <Input {...form.register(`items.${index}.description`)} placeholder="Description" />
                  </td>
                  <td className="py-2 px-2">
                     <Input 
                       type="number" step="0.01" min="0" 
                       {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} 
                       className="text-right" 
                     />
                  </td>
                  <td className="py-2 px-2">
                     <Input 
                       type="number" step="0.01" min="0" 
                       {...form.register(`items.${index}.unitCost`, { valueAsNumber: true })} 
                       className="text-right" 
                     />
                  </td>
                   <td className="py-2 px-2 text-right font-medium">
                      {formatCurrency(total)}
                   </td>
                   <td className="py-2 px-2">
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                   </td>
                </tr>
              )})}
            </tbody>
          </table>
         </div>

         {/* Total */}
         <div className="flex justify-end pt-4 border-t">
             <div className="flex items-center gap-4 text-lg font-semibold">
                <span>Total:</span>
                <span className="text-emerald-500">{formatCurrency(totals.total)}</span>
             </div>
         </div>
       </div>
       
       {/* Actions */}
       <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600">
             {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
             Create Purchase Order
          </Button>
       </div>
    </form>
  )
}
