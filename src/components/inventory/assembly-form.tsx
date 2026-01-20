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
import { createAssemblyDefinition } from '@/app/actions/inventory-actions'
import { assemblySchema, type AssemblyFormValues } from '@/lib/validations/inventory'

interface AssemblyFormProps {
  items: any[] // All items to choose from
}

export function AssemblyForm({ items }: AssemblyFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AssemblyFormValues>({
    resolver: zodResolver(assemblySchema),
    defaultValues: {
      itemId: '',
      description: '',
      yieldQuantity: 1,
      items: [
        { itemId: '', quantity: 1 }
      ]
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // Prevent selecting the same item as component that is being built (circular)
  const watchTargetItemId = form.watch('itemId')
  const availableComponentItems = items.filter(i => i.id !== watchTargetItemId)

  const onSubmit = async (data: AssemblyFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createAssemblyDefinition(data)
      if (result.success) {
        router.push('/dashboard/inventory/assemblies')
      } else {
        alert(result.error || 'Failed to create assembly')
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
      <div className="bg-card p-6 rounded-lg border space-y-6">
        <h3 className="text-lg font-semibold">Assembly Definition (Bill of Materials)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Item */}
          <div className="space-y-2">
            <Label>Item to Build *</Label>
            <Select
              onValueChange={(value) => form.setValue('itemId', value)}
              defaultValue={form.getValues('itemId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.itemId && (
              <p className="text-sm text-red-500">{form.formState.errors.itemId.message}</p>
            )}
          </div>

          {/* Yield Quantity */}
          <div className="space-y-2">
            <Label>Yield Quantity *</Label>
            <Input 
              type="number" 
              min="1"
              {...form.register('yieldQuantity', { valueAsNumber: true })} 
            />
            <p className="text-xs text-slate-500">How many units does this recipe produce?</p>
             {form.formState.errors.yieldQuantity && (
              <p className="text-sm text-red-500">{form.formState.errors.yieldQuantity.message}</p>
            )}
          </div>
          
           {/* Description */}
           <div className="col-span-1 md:col-span-2 space-y-2">
            <Label>Description</Label>
            <Input {...form.register('description')} placeholder="e.g. Standard Gift Basket Configuration" />
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="bg-card p-6 rounded-lg border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Components</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 1 })}>
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Item</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500 w-32">Qty Needed</th>
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
                          <SelectValue placeholder="Select Component" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableComponentItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </td>
                   <td className="py-2 px-2">
                      <Input 
                         type="number" step="0.0001" min="0"
                         {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
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
        <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600">
           {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
           <Save className="w-4 h-4 mr-2" />
           Save Assembly Definition
        </Button>
      </div>
    </form>
  )
}
