'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { EmployeeForm } from '@/components/employees/employee-form'
import { useEmployee } from '@/hooks/use-employees'
import { Loader2 } from 'lucide-react'

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const { data: employee, isLoading } = useEmployee(params.id)

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader
        heading="Edit Employee"
        text={`Update information for ${employee?.firstName} ${employee?.lastName}`}
      />
      <div className="grid gap-4">
        <EmployeeForm employee={employee} />
      </div>
    </div>
  )
}
