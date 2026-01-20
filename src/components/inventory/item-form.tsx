'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, AlertCircle, X } from 'lucide-react'
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
  // Peachtree-standard fields
  sellingPrice2: z.number().min(0).optional(),  // Wholesale
  sellingPrice3: z.number().min(0).optional(),  // Distributor
  taxable: z.boolean().default(true),
  barcode: z.string().optional(),
  location: z.string().optional(),
  weight: z.number().min(0).optional(),
  weightUnit: z.string().default('Kg'),
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
  const [formError, setFormError] = useState<string | null>(null)

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
      // Peachtree fields
      sellingPrice2: item ? Number(item.sellingPrice2) || undefined : undefined,
      sellingPrice3: item ? Number(item.sellingPrice3) || undefined : undefined,
      taxable: item?.taxable ?? true,
      barcode: item?.barcode || '',
      location: item?.location || '',
      weight: item ? Number(item.weight) || undefined : undefined,
      weightUnit: item?.weightUnit || 'Kg',
    },
  })

  const onSubmit = async (data: ItemFormValues) => {
    setFormError(null)
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
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setFormError(errorMessage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const isLoading = createItem.isPending || updateItem.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Error Banner */}
      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-800">Error</h4>
            <p className="text-red-700 text-sm mt-1">{formError}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

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
            <Label>Selling Price - Retail (ETB) *</Label>
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

        {/* Price Levels (Peachtree) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Wholesale Price (Level 2)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register('sellingPrice2', { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Distributor Price (Level 3)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register('sellingPrice3', { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Switch
            id="taxable"
            checked={form.watch('taxable')}
            onCheckedChange={(checked) => form.setValue('taxable', checked)}
          />
          <div>
            <Label htmlFor="taxable" className="cursor-pointer">Taxable (15% VAT)</Label>
            <p className="text-xs text-muted-foreground">Item is subject to Value Added Tax</p>
          </div>
        </div>
      </div>

      {/* Additional Info (Peachtree) */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Additional Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Barcode (UPC/EAN)</Label>
            <Input
              {...form.register('barcode')}
              placeholder="e.g., 0123456789012"
            />
          </div>

          <div className="space-y-2">
            <Label>Warehouse Location</Label>
            <Input
              {...form.register('location')}
              placeholder="e.g., A-12-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Weight</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register('weight', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={form.watch('weightUnit')}
                onValueChange={(value) => form.setValue('weightUnit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Gram">Gram</SelectItem>
                  <SelectItem value="Lb">Lb</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
