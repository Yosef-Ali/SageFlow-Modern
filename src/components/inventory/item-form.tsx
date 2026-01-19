'use client'

import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { useCreateItem, useUpdateItem, useItemCategories } from '@/hooks/use-inventory'
import { z } from 'zod'

const itemFormSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  type: z.enum(['PRODUCT', 'SERVICE', 'BUNDLE']).default('PRODUCT'),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  reorderPoint: z.number().min(0).default(0),
  reorderQuantity: z.number().min(0).default(0),
  quantityOnHand: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
})

type ItemFormValues = z.infer<typeof itemFormSchema>

interface ItemFormProps {
  item?: any
  onSuccess?: () => void
}

const itemTypes = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'BUNDLE', label: 'Bundle' },
]

const unitTypes = [
  'Each',
  'Box',
  'Pack',
  'Kg',
  'Gram',
  'Liter',
  'Meter',
  'Hour',
  'Day',
]

export function ItemForm({ item, onSuccess }: ItemFormProps) {
  const router = useRouter()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const { data: categories } = useItemCategories()
  const isEditing = !!item

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      sku: item?.sku || '',
      name: item?.name || '',
      description: item?.description || '',
      categoryId: item?.categoryId || '',
      unitOfMeasure: item?.unitOfMeasure || 'Each',
      type: item?.type || 'PRODUCT',
      costPrice: item ? Number(item.costPrice) : 0,
      sellingPrice: item ? Number(item.sellingPrice) : 0,
      reorderPoint: item ? Number(item.reorderPoint) : 0,
      reorderQuantity: item ? Number(item.reorderQuantity) : 0,
      quantityOnHand: item ? Number(item.quantityOnHand) : 0,
      isActive: item?.isActive ?? true,
    },
  })

  const onSubmit = async (data: ItemFormValues) => {
    try {
      if (isEditing) {
        await updateItem.mutateAsync({ id: item.id, data })
      } else {
        await createItem.mutateAsync(data)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/inventory')
      }
    } catch (error) {
      // Error handled by mutation hook
    }
  }

  const isLoading = createItem.isPending || updateItem.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>SKU *</Label>
            <Input
              {...form.register('sku')}
              placeholder="e.g., PROD-001"
            />
            {form.formState.errors.sku && (
              <p className="text-sm text-red-500">{form.formState.errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Name *</Label>
            <Input
              {...form.register('name')}
              placeholder="Item name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            {...form.register('description')}
            placeholder="Item description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value) => form.setValue('type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch('categoryId') || 'none'}
              onValueChange={(value) => form.setValue('categoryId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories?.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Unit of Measure *</Label>
            <Select
              value={form.watch('unitOfMeasure')}
              onValueChange={(value) => form.setValue('unitOfMeasure', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {unitTypes.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Pricing</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Cost Price (ETB) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register('costPrice', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.costPrice && (
              <p className="text-sm text-red-500">{form.formState.errors.costPrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Selling Price (ETB) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register('sellingPrice', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.sellingPrice && (
              <p className="text-sm text-red-500">{form.formState.errors.sellingPrice.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Inventory</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Quantity on Hand</Label>
            <Input
              type="number"
              step="1"
              min="0"
              {...form.register('quantityOnHand', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Reorder Point</Label>
            <Input
              type="number"
              step="1"
              min="0"
              {...form.register('reorderPoint', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Reorder Quantity</Label>
            <Input
              type="number"
              step="1"
              min="0"
              {...form.register('reorderQuantity', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={form.watch('isActive')}
            onCheckedChange={(checked) => form.setValue('isActive', checked)}
          />
          <Label htmlFor="isActive">Active (available for sale)</Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/inventory')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
