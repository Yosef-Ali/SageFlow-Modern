'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { EmployeeForm } from '@/components/employees/employee-form'

export default function NewEmployeePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader
        heading="New Employee"
        text="Add a new employee to your company directory."
      />
      <div className="grid gap-4">
        <EmployeeForm />
      </div>
    </div>
  )
}
