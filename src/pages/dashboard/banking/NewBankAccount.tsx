import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateBankAccount } from '@/hooks/use-banking'
import { useForm } from 'react-hook-form'

export default function NewBankAccountPage() {
  const navigate = useNavigate()
  const createAccount = useCreateBankAccount()
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      accountName: '',
      accountNumber: '',
      accountType: 'CHECKING',
      bankName: '',
      currency: 'ETB',
      openingBalance: 0,
      isActive: true,
    },
  })

  const onSubmit = async (data: any) => {
    await createAccount.mutateAsync(data)
    navigate('/dashboard/banking')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/banking')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Bank Account</h1>
          <p className="text-muted-foreground mt-1">Add a new bank account to track</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input {...register('accountName', { required: true })} placeholder="Business Checking" />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input {...register('accountNumber')} placeholder="1234567890" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select value={watch('accountType')} onValueChange={(v) => setValue('accountType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Checking</SelectItem>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="MONEY_MARKET">Money Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input {...register('bankName')} placeholder="Commercial Bank of Ethiopia" />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input type="number" step="0.01" {...register('openingBalance', { valueAsNumber: true })} placeholder="0.00" />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard/banking')}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
