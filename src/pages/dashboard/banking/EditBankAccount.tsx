import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBankAccount, useUpdateBankAccount } from '@/hooks/use-banking'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'

export default function EditBankAccountPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: account, isLoading, error } = useBankAccount(id || '')
  const updateAccount = useUpdateBankAccount()
  const { register, handleSubmit, setValue, watch, reset } = useForm()

  useEffect(() => {
    if (account) {
      const accData = account as any
      reset({
        accountName: accData.account_name,
        accountNumber: accData.account_number,
        accountType: accData.account_type,
        bankName: accData.bank_name,
        currency: accData.currency,
        isActive: accData.is_active,
      })
    }
  }, [account, reset])

  const onSubmit = async (data: any) => {
    if (!id) return
    await updateAccount.mutateAsync({ id, data })
    navigate(`/dashboard/banking/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Account Not Found</h2>
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find this bank account."}</p>
        <Button onClick={() => navigate('/dashboard/banking')}>Back to Banking</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Bank Account</h1>
          <p className="text-muted-foreground mt-1">Update: {(account as any).account_name}</p>
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
                <Input {...register('accountName', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input {...register('accountNumber')} />
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
                <Input {...register('bankName')} />
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? 'Updating...' : 'Update Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
