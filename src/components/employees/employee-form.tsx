
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, AlertCircle, X } from 'lucide-react'
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
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/use-employees'
import { z } from 'zod'

import { employeeSchema, type EmployeeFormValues } from '@/lib/validations/employee'

interface EmployeeFormProps {
  employee?: any
  onSuccess?: () => void
}

export function EmployeeForm({ employee, onSuccess }: EmployeeFormProps) {
  const navigate = useNavigate()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const isEditing = !!employee
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeCode: employee?.employeeCode || '',
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      jobTitle: employee?.jobTitle || '',
      department: employee?.department || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      ssn: employee?.ssn || '',
      payMethod: employee?.payMethod || '',
      payFrequency: employee?.payFrequency || '',
      address: employee?.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      hireDate: employee?.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
      isActive: employee?.isActive ?? true,
      // Peachtree fields
      employeeType: employee?.employeeType || 'REGULAR',
      payRate: employee?.payRate ? Number(employee.payRate) : undefined,
      overtimeRate: employee?.overtimeRate ? Number(employee.overtimeRate) : 1.5,
      bankAccountNo: employee?.bankAccountNo || '',
      bankName: employee?.bankName || '',
      taxId: employee?.taxId || '',
      emergencyContactName: employee?.emergencyContactName || '',
      emergencyContactPhone: employee?.emergencyContactPhone || '',
      terminationDate: employee?.terminationDate ? new Date(employee.terminationDate).toISOString().split('T')[0] : '',
    },
  })

  // Update form when employee data is loaded
  useEffect(() => {
    if (employee) {
      form.reset({
        employeeCode: employee.employeeCode || '',
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        jobTitle: employee.jobTitle || '',
        department: employee.department || '',
        email: employee.email || '',
        phone: employee.phone || '',
        ssn: employee.ssn || '',
        payMethod: employee.payMethod || '',
        payFrequency: employee.payFrequency || '',
        address: employee.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
        isActive: employee.isActive ?? true,
        employeeType: employee.employeeType || 'REGULAR',
        payRate: employee.payRate ? Number(employee.payRate) : undefined,
        overtimeRate: employee.overtimeRate ? Number(employee.overtimeRate) : 1.5,
        bankAccountNo: employee.bankAccountNo || '',
        bankName: employee.bankName || '',
        taxId: employee.taxId || '',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        terminationDate: employee.terminationDate ? new Date(employee.terminationDate).toISOString().split('T')[0] : '',
      })
    }
  }, [employee, form])

  const onSubmit = async (data: EmployeeFormValues) => {
    setFormError(null)
    try {
      if (isEditing) {
        await updateEmployee.mutateAsync({ id: employee.id, data })
      } else {
        await createEmployee.mutateAsync(data)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/dashboard/employees')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setFormError(errorMessage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const isLoading = createEmployee.isPending || updateEmployee.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Error Banner */}
      {formError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-destructive">Error</h4>
            <p className="text-destructive/80 text-sm mt-1">{formError}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-destructive/60 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-card p-6 rounded-lg border space-y-6">
        <h3 className="text-lg font-semibold">Employee Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Employee ID *</Label>
            <Input {...form.register('employeeCode')} placeholder="e.g., EMP001" />
            {form.formState.errors.employeeCode && (
              <p className="text-sm text-red-500">{form.formState.errors.employeeCode.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input {...form.register('jobTitle')} placeholder="e.g., Accountant" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input {...form.register('firstName')} />
            {form.formState.errors.firstName && (
              <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input {...form.register('lastName')} />
            {form.formState.errors.lastName && (
              <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...form.register('email')} type="email" />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...form.register('phone')} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
            <Label>Hire Date</Label>
            <Input {...form.register('hireDate')} type="date" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center space-x-2 h-10">
              <Switch
                checked={form.watch('isActive')}
                onCheckedChange={(checked) => form.setValue('isActive', checked)}
              />
              <span className="text-sm">{form.watch('isActive') ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        
         <h3 className="text-lg font-semibold pt-4 border-t">Payroll & Banking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
            <Label>Employee Type</Label>
            <Select
              value={form.watch('employeeType')}
              onValueChange={(value) => form.setValue('employeeType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="TEMPORARY">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div className="space-y-2">
            <Label>Tax ID (TIN)</Label>
            <Input {...form.register('taxId')} placeholder="TIN Number" />
          </div>
           <div className="space-y-2">
            <Label>Pay Rate</Label>
            <Input 
              type="number" 
              step="0.01"
              {...form.register('payRate', { valueAsNumber: true })} 
              placeholder="0.00" 
            />
          </div>
           <div className="space-y-2">
            <Label>Overtime Rate (Multiplier)</Label>
            <Input 
              type="number" 
              step="0.1"
              {...form.register('overtimeRate', { valueAsNumber: true })} 
              placeholder="1.5" 
            />
          </div>
           <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input {...form.register('bankName')} placeholder="e.g. CBE" />
          </div>
           <div className="space-y-2">
            <Label>Account Number</Label>
            <Input {...form.register('bankAccountNo')} />
          </div>
        </div>

        <h3 className="text-lg font-semibold pt-4 border-t">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input {...form.register('emergencyContactName')} />
          </div>
           <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input {...form.register('emergencyContactPhone')} />
          </div>
        </div>

      </div>

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard/employees')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Employee' : 'Create Employee'}
        </Button>
      </div>
    </form>
  )
}
