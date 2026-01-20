'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateVendor, useUpdateVendor } from '@/hooks/use-vendors'
import { vendorSchema, vendorTypes, paymentTerms, type VendorFormValues } from '@/lib/validations/vendor'

const ethiopianRegions = [
  'Addis Ababa',
  'Oromia',
  'Amhara',
  'Tigray',
  'SNNPR',
  'Afar',
  'Somali',
  'Benishangul-Gumuz',
  'Gambela',
  'Harari',
  'Dire Dawa',
  'Sidama',
]

interface VendorFormProps {
  vendor?: any
  onSuccess?: () => void
}

export function VendorForm({ vendor, onSuccess }: VendorFormProps) {
  const router = useRouter()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const isEditing = !!vendor
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
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
        country: vendor?.address?.country || 'Ethiopia',
      },
      taxId: vendor?.taxId || '',
      notes: vendor?.notes || '',
      isActive: vendor?.isActive ?? true,
      // Peachtree-standard fields
      vendorType: vendor?.vendorType || 'SUPPLIER',
      paymentTerms: vendor?.paymentTerms || 'NET_30',
      contactName: vendor?.contactName || '',
      discountPercent: Number(vendor?.discountPercent) || 0,
      creditLimit: Number(vendor?.creditLimit) || 0,
      taxExempt: vendor?.taxExempt || false,
      taxExemptNumber: vendor?.taxExemptNumber || '',
    },
  })

  // Watch taxExempt for conditional rendering
  const taxExempt = form.watch('taxExempt')

  const onSubmit = async (data: VendorFormValues) => {
    setFormError(null)
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
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setFormError(errorMessage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const isLoading = createVendor.isPending || updateVendor.isPending

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

      {/* Vendor Details */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Vendor Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Vendor Name *</Label>
            <Input
              {...form.register('name')}
              placeholder="e.g., Ethiopian Trading Co."
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
            <Label>Contact Person</Label>
            <Input
              {...form.register('contactName')}
              placeholder="Primary contact name"
            />
          </div>

          <div className="space-y-2">
            <Label>Vendor Type</Label>
            <Select
              value={form.watch('vendorType')}
              onValueChange={(value) => form.setValue('vendorType', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {vendorTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>TIN (Tax ID)</Label>
            <Input
              {...form.register('taxId')}
              placeholder="10-digit TIN"
            />
          </div>
        </div>
      </div>

      {/* Account Settings (Peachtree-style) */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Account Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Select
              value={form.watch('paymentTerms')}
              onValueChange={(value) => form.setValue('paymentTerms', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select terms" />
              </SelectTrigger>
              <SelectContent>
                {paymentTerms.map((term) => (
                  <SelectItem key={term.value} value={term.value}>
                    {term.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Credit Limit (ETB)</Label>
            <Input
              type="number"
              placeholder="0.00"
              {...form.register('creditLimit', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Discount %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              {...form.register('discountPercent', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center space-x-3 pt-6">
            <Switch
              id="taxExempt"
              checked={taxExempt}
              onCheckedChange={(checked: boolean) => form.setValue('taxExempt', checked)}
            />
            <div>
              <Label htmlFor="taxExempt" className="cursor-pointer">VAT Exempt</Label>
              <p className="text-xs text-muted-foreground">Vendor is exempt from 15% VAT</p>
            </div>
          </div>
        </div>

        {taxExempt && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Exemption Certificate #</Label>
              <Input
                {...form.register('taxExemptNumber')}
                placeholder="Certificate number"
              />
            </div>
          </div>
        )}
      </div>

      {/* Address */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Address</h3>

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
            <Select
              value={form.watch('address.state') || ''}
              onValueChange={(value) => form.setValue('address.state', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {ethiopianRegions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input
              {...form.register('address.country')}
              placeholder="Ethiopia"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
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
