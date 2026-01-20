'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createInventoryAdjustment } from '@/app/actions/inventory-actions'
import { inventoryAdjustmentSchema, type InventoryAdjustmentFormValues } from '@/lib/validations/inventory'

interface AdjustmentFormProps {
  items: any[]
}

export function AdjustmentForm({ items }: AdjustmentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: {
      date: new Date(),
      reason: '',
      reference: '',
      items: [
        { itemId: '', quantity: 0 }
      ]
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const onSubmit = async (data: InventoryAdjustmentFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createInventoryAdjustment(data)
      if (result.success) {
        router.push('/dashboard/inventory') // Or adjustments list if I create one
      } else {
        alert(result.error || 'Failed to record adjustment')
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Stock Adjustment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input 
              type="date" 
              {...form.register('date', { valueAsDate: true })} 
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label>Reference (Optional)</Label>
            <Input {...form.register('reference')} placeholder="e.g. Audit #123" />
          </div>

           <div className="col-span-1 md:col-span-2 space-y-2">
            <Label>Reason / Notes</Label>
            <Textarea {...form.register('reason')} placeholder="e.g. Broken packaging, Found in warehouse..." />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Items to Adjust</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 0 })}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Item</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-32">Adjustment Qty</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-32">Unit Cost (Optional)</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} className="border-b">
                   <td className="py-2 px-2">
                      <Select
                        onValueChange={(val) => form.setValue(`items.${index}.itemId`, val)}
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
                      <Input 
                         type="number" step="0.0001"
                         {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                         className="text-right"
                         placeholder="+ / -"
                      />
                   </td>
                   <td className="py-2 px-2">
                      <Input 
                         type="number" step="0.01" min="0" placeholder="Auto"
                         {...form.register(`items.${index}.unitCost`, { valueAsNumber: true })}
                         className="text-right"
                      />
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
              ))}
            </tbody>
          </table>
        </div>
         {form.formState.errors.items && (
            <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
           {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
           <Save className="w-4 h-4 mr-2" />
           Post Adjustment
        </Button>
      </div>
    </form>
  )
}
