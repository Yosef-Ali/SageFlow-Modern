'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { useCreateBankAccount, useUpdateBankAccount } from '@/hooks/use-banking'
import { z } from 'zod'

const bankAccountFormSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account Number is required'),
  bankName: z.string().optional(),
  accountType: z.enum(['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'OTHER']).default('CHECKING'),
  currency: z.string().default('ETB'),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true),
})

type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>

interface BankAccountFormProps {
  account?: any
  onSuccess?: () => void
}

const accountTypes = [
  { value: 'CHECKING', label: 'Checking' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'OTHER', label: 'Other' },
]

export function BankAccountForm({ account, onSuccess }: BankAccountFormProps) {
  const router = useRouter()
  const createAccount = useCreateBankAccount()
  const updateAccount = useUpdateBankAccount()
  const isEditing = !!account

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: {
      accountName: account?.accountName || '',
      accountNumber: account?.accountNumber || '',
      bankName: account?.bankName || '',
      accountType: account?.accountType || 'CHECKING',
      currency: account?.currency || 'ETB',
      openingBalance: account ? Number(account.openingBalance) : 0,
      isActive: account?.isActive ?? true,
    },
  })

  const onSubmit = async (data: BankAccountFormValues) => {
    try {
      if (isEditing) {
        await updateAccount.mutateAsync({ id: account.id, data })
      } else {
        await createAccount.mutateAsync(data)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/banking')
      }
    } catch (error) {
      // Error handled by mutation hook
    }
  }

  const isLoading = createAccount.isPending || updateAccount.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
        <h3 className="text-lg font-semibold">Account Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Account Name *</Label>
            <Input
              {...form.register('accountName')}
              placeholder="e.g., Main Business Account"
            />
            {form.formState.errors.accountName && (
              <p className="text-sm text-red-500">{form.formState.errors.accountName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Account Type *</Label>
            <Select
              value={form.watch('accountType')}
              onValueChange={(value: any) => form.setValue('accountType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
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
            <Label>Bank Name</Label>
            <Input
              {...form.register('bankName')}
              placeholder="e.g., Commercial Bank of Ethiopia"
            />
          </div>

          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              {...form.register('accountNumber')}
              placeholder="Account number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={form.watch('currency')}
              onValueChange={(value) => form.setValue('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('openingBalance', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={form.watch('isActive')}
            onCheckedChange={(checked: boolean) => form.setValue('isActive', checked)}
          />
          <Label htmlFor="isActive">Active account</Label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/banking')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Account' : 'Create Account'}
        </Button>
      </div>
    </form>
  )
}
