'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCreateVendor, useUpdateVendor } from '@/hooks/use-vendors'
import { z } from 'zod'

const vendorFormSchema = z.object({
  vendorNumber: z.string().optional(),
  name: z.string().min(1, 'Vendor name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

type VendorFormValues = z.infer<typeof vendorFormSchema>

interface VendorFormProps {
  vendor?: any
  onSuccess?: () => void
}

export function VendorForm({ vendor, onSuccess }: VendorFormProps) {
  const router = useRouter()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const isEditing = !!vendor

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      vendorNumber: vendor?.vendorNumber || '',
      name: vendor?.name || '',
      email: vendor?.email || '',
      phone: vendor?.phone || '',
      address: {
        street: vendor?.address?.street || '',
        city: vendor?.address?.city || '',
        state: vendor?.address?.state || '',
        zip: vendor?.address?.zip || '',
        country: vendor?.address?.country || '',
      },
      taxId: vendor?.taxId || '',
      paymentTerms: vendor?.paymentTerms || '',
      notes: vendor?.notes || '',
      isActive: vendor?.isActive ?? true,
    },
  })

  const onSubmit = async (data: VendorFormValues) => {
    try {
      if (isEditing) {
        await updateVendor.mutateAsync({ id: vendor.id, data })
      } else {
        await createVendor.mutateAsync(data)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/vendors')
      }
    } catch (error) {
      // Error handled by mutation hook
    }
  }

  const isLoading = createVendor.isPending || updateVendor.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Vendor Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Vendor Name *</Label>
            <Input
              {...form.register('name')}
              placeholder="e.g., Acme Corp"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Vendor Number</Label>
            <Input
              {...form.register('vendorNumber')}
              placeholder="Auto-generated if empty"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              {...form.register('email')}
              placeholder="vendor@example.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              {...form.register('phone')}
              placeholder="+251 ..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Tax ID</Label>
            <Input
              {...form.register('taxId')}
              placeholder="TIN number"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Input
              {...form.register('paymentTerms')}
              placeholder="e.g., Net 30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Street Address</Label>
          <Input
            {...form.register('address.street')}
            placeholder="123 Street Name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              {...form.register('address.city')}
              placeholder="Addis Ababa"
            />
          </div>
          <div className="space-y-2">
            <Label>State / Region</Label>
            <Input
              {...form.register('address.state')}
              placeholder="AA"
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input
              {...form.register('address.country')}
              placeholder="Ethiopia"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            {...form.register('notes')}
            placeholder="Additional information about the vendor"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={form.watch('isActive')}
            onCheckedChange={(checked: boolean) => form.setValue('isActive', checked)}
          />
          <Label htmlFor="isActive">Active Vendor</Label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/vendors')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Vendor' : 'Create Vendor'}
        </Button>
      </div>
    </form>
  )
}
