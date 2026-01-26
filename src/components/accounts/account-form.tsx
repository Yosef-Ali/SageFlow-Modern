
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useCreateAccount, useUpdateAccount, useAccounts } from '@/hooks/use-accounts'
import { z } from 'zod'

const accountFormSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  accountName: z.string().min(1, 'Account name is required'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.string().optional(),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

interface AccountFormProps {
  account?: any
  onSuccess?: () => void
}

const accountTypes = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' },
]

export function AccountForm({ account, onSuccess }: AccountFormProps) {
  const navigate = useNavigate()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const { data: accountsData } = useAccounts()
  const isEditing = !!account

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      accountNumber: account?.accountNumber || '',
      accountName: account?.accountName || '',
      type: account?.type || 'ASSET',
      parentId: account?.parentId || '',
      openingBalance: account ? Number(account.balance) : 0,
      isActive: account?.isActive ?? true,
    },
  })

  const onSubmit = async (data: AccountFormValues) => {
    try {
      if (isEditing) {
        await updateAccount.mutateAsync({ id: account.id, data })
      } else {
        await createAccount.mutateAsync(data)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/dashboard/chart-of-accounts')
      }
    } catch (error) {
      // Error handled by mutation hook
    }
  }

  const isLoading = createAccount.isPending || updateAccount.isPending

  // Filter out current account from parent options to avoid circular dependency
  const parentOptions = accountsData?.filter((a: any) => a.id !== account?.id) || []

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-card p-6 rounded-lg border border-border space-y-6">
        <h3 className="text-lg font-semibold">Account Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Account Number *</Label>
            <Input
              {...form.register('accountNumber')}
              placeholder="e.g., 10100"
            />
            {form.formState.errors.accountNumber && (
              <p className="text-sm text-red-500">{form.formState.errors.accountNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Account Name *</Label>
            <Input
              {...form.register('accountName')}
              placeholder="e.g., Cash on Hand"
            />
            {form.formState.errors.accountName && (
              <p className="text-sm text-red-500">{form.formState.errors.accountName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value: any) => form.setValue('type', value)}
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
            {form.formState.errors.type && (
              <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Parent Account</Label>
            <Select
              value={form.watch('parentId')}
              onValueChange={(value) => form.setValue('parentId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Root Account)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Root Account)</SelectItem>
                {parentOptions.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.accountNumber} - {acc.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('openingBalance', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={form.watch('isActive')}
            onCheckedChange={(checked: boolean) => form.setValue('isActive', checked)}
          />
          <Label htmlFor="isActive">Active Account</Label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard/chart-of-accounts')}
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
