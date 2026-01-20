'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { customerSchema, type CustomerFormValues, customerTypes, paymentTerms, priceLevels } from '@/lib/validations/customer'
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-customers'
import { type SerializedCustomer } from '@/types/customer'
import { Loader2 } from 'lucide-react'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: SerializedCustomer | null
  onClose: () => void
}

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

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onClose,
}: CustomerFormDialogProps) {
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      taxId: '',
      billingAddress: {
        street: '',
        city: '',
        region: '',
        country: 'Ethiopia',
        postalCode: '',
      },
      shippingAddress: {
        street: '',
        city: '',
        region: '',
        country: 'Ethiopia',
        postalCode: '',
      },
      sameAsBilling: true,
      creditLimit: 0,
      notes: '',
      // Peachtree-standard defaults
      customerType: 'RETAIL',
      paymentTerms: 'NET_30',
      contactName: '',
      discountPercent: 0,
      taxExempt: false,
      taxExemptNumber: '',
      priceLevel: '1',
    },
  })

  // Load customer data when dialog opens for editing
  useEffect(() => {
    if (!open) return // Only run when dialog is open

    if (customer) {
      const billingAddress = (customer.billingAddress as any) || {
        street: '',
        city: '',
        region: '',
        country: 'Ethiopia',
        postalCode: '',
      }
      const shippingAddress = (customer.shippingAddress as any) || {
        street: '',
        city: '',
        region: '',
        country: 'Ethiopia',
        postalCode: '',
      }

      const isSameAsBilling = JSON.stringify(billingAddress) === JSON.stringify(shippingAddress)
      setSameAsBilling(isSameAsBilling)

      // Use reset with all fields explicitly set
      form.reset({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        taxId: customer.taxId || '',
        billingAddress,
        shippingAddress,
        sameAsBilling: isSameAsBilling,
        creditLimit: customer.creditLimit || 0,
        notes: customer.notes || '',
        // Peachtree fields
        customerType: (customer as any).customerType || 'RETAIL',
        paymentTerms: (customer as any).paymentTerms || 'NET_30',
        contactName: (customer as any).contactName || '',
        discountPercent: Number((customer as any).discountPercent) || 0,
        taxExempt: (customer as any).taxExempt || false,
        taxExemptNumber: (customer as any).taxExemptNumber || '',
        priceLevel: (customer as any).priceLevel || '1',
      })
    } else {
      // Reset to empty form for new customer
      form.reset({
        name: '',
        email: '',
        phone: '',
        taxId: '',
        billingAddress: {
          street: '',
          city: '',
          region: '',
          country: 'Ethiopia',
          postalCode: '',
        },
        shippingAddress: {
          street: '',
          city: '',
          region: '',
          country: 'Ethiopia',
          postalCode: '',
        },
        sameAsBilling: true,
        creditLimit: 0,
        notes: '',
        customerType: 'RETAIL',
        paymentTerms: 'NET_30',
        contactName: '',
        discountPercent: 0,
        taxExempt: false,
        taxExemptNumber: '',
        priceLevel: '1',
      })
      setSameAsBilling(true)
    }
  }, [open, customer]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      if (customer) {
        await updateCustomer.mutateAsync({ id: customer.id, data })
      } else {
        await createCustomer.mutateAsync(data)
      }
      onClose()
      form.reset()
    } catch (error) {
      // Error is handled by the mutation hooks
    }
  }

  const isLoading = createCustomer.isPending || updateCustomer.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? 'Update customer information'
              : 'Fill in the customer details below'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Company/Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Primary contact name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customerTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="customer@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="+251912345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TIN (Tax ID)</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit TIN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Account Settings (Peachtree-style) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Account Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentTerms.map((term) => (
                            <SelectItem key={term.value} value={term.value}>
                              {term.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit (ETB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priceLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxExempt"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>VAT Exempt</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Customer is exempt from 15% VAT
                        </p>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch('taxExempt') && (
                  <FormField
                    control={form.control}
                    name="taxExemptNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exemption Certificate #</FormLabel>
                        <FormControl>
                          <Input placeholder="Certificate number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Billing Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingAddress.street"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingAddress.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingAddress.region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ethiopianRegions.map((region) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingAddress.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Shipping Address</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => {
                      setSameAsBilling(e.target.checked)
                      form.setValue('sameAsBilling', e.target.checked)
                    }}
                    className="rounded"
                  />
                  Same as billing
                </label>
              </div>
              {!sameAsBilling && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="shippingAddress.street"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingAddress.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingAddress.region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ethiopianRegions.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingAddress.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this customer"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {customer ? 'Update Customer' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
