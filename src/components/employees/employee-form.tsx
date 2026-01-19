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
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/use-employees'
import { z } from 'zod'

// Shared schema to match server action
const employeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  ssn: z.string().optional(),
  payMethod: z.string().optional(),
  payFrequency: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  hireDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

type EmployeeFormTypes = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  employee?: any
  onSuccess?: () => void
}

export function EmployeeForm({ employee, onSuccess }: EmployeeFormProps) {
  const router = useRouter()
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const isEditing = !!employee

  const form = useForm<EmployeeFormTypes>({
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
    },
  })

  const onSubmit = async (data: EmployeeFormTypes) => {
    try {
      if (isEditing) {
        await updateEmployee.mutateAsync({ id: employee.id, data })
      } else {
        await createEmployee.mutateAsync(data)
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/employees')
      }
    } catch (error) {
      // Error handled by mutation hook
    }
  }

  const isLoading = createEmployee.isPending || updateEmployee.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-6">
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
        
        <h3 className="text-lg font-semibold pt-4 border-t">Payroll Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
            <Label>SSN / Tax ID</Label>
            <Input {...form.register('ssn')} />
          </div>
           <div className="space-y-2">
            <Label>Department</Label>
            <Input {...form.register('department')} />
          </div>
        </div>

      </div>

      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/employees')}
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
