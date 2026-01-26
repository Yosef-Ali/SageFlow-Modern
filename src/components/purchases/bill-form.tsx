
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
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
import { formatCurrency } from '@/lib/utils'
import {
  billSchema,
  type BillFormValues,
} from '@/lib/validations/purchase'
import { createBill } from '@/app/actions/purchase-actions'

interface BillFormProps {
  vendors: any[]
  openPOs: any[]
}

export function BillForm({ vendors, openPOs }: BillFormProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filteredPOs, setFilteredPOs] = useState<any[]>([])

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      vendorId: '',
      poId: '',
      billNumber: '',
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      totalAmount: 0,
      status: 'OPEN',
      notes: '',
    },
  })

  const watchVendorId = form.watch('vendorId')
  const watchPoId = form.watch('poId')

  // Filter POs by selected Vendor
  useEffect(() => {
    if (watchVendorId) {
      setFilteredPOs(openPOs.filter(po => po.vendorId === watchVendorId))
    } else {
      setFilteredPOs([])
    }
  }, [watchVendorId, openPOs])

  // Pre-fill amount when PO selected
  useEffect(() => {
    if (watchPoId) {
      const po = openPOs.find(p => p.id === watchPoId)
      if (po) {
        form.setValue('totalAmount', Number(po.totalAmount))
        form.setValue('billNumber', `INV-${po.poNumber}`) // Suggest a bill number
      }
    }
  }, [watchPoId, openPOs, form])

  const onSubmit = async (data: BillFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createBill(data)
      if (result.success) {
         toast({
            title: 'Success',
            description: 'Bill created successfully',
         })
         navigate('/dashboard/purchases/bills')
      } else {
         toast({
            title: 'Error',
            description: result.error || 'Failed to create Bill',
            variant: 'destructive',
         })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-card p-6 rounded-lg border space-y-6">
        <h3 className="text-lg font-semibold">Bill Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Vendor */}
          <div className="space-y-2">
            <Label>Vendor *</Label>
            <Select
              onValueChange={(value) => form.setValue('vendorId', value)}
              defaultValue={form.getValues('vendorId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.vendorId && (
              <p className="text-sm text-red-500">{form.formState.errors.vendorId.message}</p>
            )}
          </div>

           {/* Purchase Order (Optional link) */}
           <div className="space-y-2">
            <Label>Link Purchase Order (Optional)</Label>
            <Select
              onValueChange={(value) => form.setValue('poId', value)}
               // reset if vendor changes
              key={watchVendorId}
            >
              <SelectTrigger disabled={!watchVendorId || filteredPOs.length === 0}>
                <SelectValue placeholder={filteredPOs.length === 0 ? "No open POs" : "Select PO"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {filteredPOs.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.poNumber} - {formatCurrency(Number(po.totalAmount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bill Number */}
          <div className="space-y-2">
            <Label>Bill / Invoice Number *</Label>
            <Input {...form.register('billNumber')} placeholder="e.g. INV-2024-001" />
             {form.formState.errors.billNumber && (
              <p className="text-sm text-red-500">{form.formState.errors.billNumber.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Total Amount *</Label>
            <Input 
              type="number" step="0.01" 
              {...form.register('totalAmount', { valueAsNumber: true })} 
            />
             {form.formState.errors.totalAmount && (
              <p className="text-sm text-red-500">{form.formState.errors.totalAmount.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
             <Input
              type="date"
              value={form.watch('date')?.toISOString().split('T')[0]}
              onChange={(e) => form.setValue('date', new Date(e.target.value))}
            />
            {form.formState.errors.date && (
              <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
            )}
          </div>
          
           {/* Due Date */}
           <div className="space-y-2">
            <Label>Due Date *</Label>
             <Input
              type="date"
              value={form.watch('dueDate')?.toISOString().split('T')[0]}
              onChange={(e) => form.setValue('dueDate', new Date(e.target.value))}
            />
             {form.formState.errors.dueDate && (
              <p className="text-sm text-red-500">{form.formState.errors.dueDate.message}</p>
            )}
          </div>

        </div>
        
         <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register('notes')} placeholder="Notes" />
          </div>
      </div>
       
       {/* Actions */}
       <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600">
             {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
             Enter Bill
          </Button>
       </div>
    </form>
  )
}
