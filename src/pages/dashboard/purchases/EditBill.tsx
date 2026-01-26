import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBill, useUpdateBill } from '@/hooks/use-purchases'
import { useForm } from 'react-hook-form'

export default function EditBillPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: bill, isLoading, error } = useBill(id || '')
  const updateBill = useUpdateBill()
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (bill) {
      reset({
        vendorId: bill.vendor_id,
        billNumber: bill.bill_number,
        date: new Date(bill.date).toISOString().split('T')[0],
        dueDate: new Date(bill.due_date).toISOString().split('T')[0],
        totalAmount: bill.total_amount,
        notes: bill.notes || '',
      })
    }
  }, [bill, reset])

  const onSubmit = async (data: any) => {
    if (!id) return
    await updateBill.mutateAsync({ id, data })
    navigate(`/dashboard/purchases/bills/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Bill Not Found</h2>
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find this bill."}</p>
        <Button onClick={() => navigate('/dashboard/purchases/bills')}>Back to Bills</Button>
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
          <h1 className="text-3xl font-bold">Edit Bill</h1>
          <p className="text-muted-foreground mt-1">Update Bill #{bill.bill_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Bill Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bill Number *</Label>
                <Input {...register('billNumber', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Total Amount *</Label>
                <Input type="number" step="0.01" {...register('totalAmount', { required: true, valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" {...register('date', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" {...register('dueDate', { required: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...register('notes')} rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateBill.isPending}>
                {updateBill.isPending ? 'Updating...' : 'Update Bill'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
