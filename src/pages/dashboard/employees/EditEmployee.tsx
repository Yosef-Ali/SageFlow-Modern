import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmployeeForm } from '@/components/employees/employee-form'
import { useEmployee } from '@/hooks/use-employees'

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: employee, isLoading, error } = useEmployee(id || '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find the employee you're looking for."}</p>
        <Button onClick={() => navigate('/dashboard/employees')}>Back to Employees</Button>
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
          <h1 className="text-3xl font-bold">Edit Employee</h1>
          <p className="text-muted-foreground mt-1">Update employee: {employee.firstName} {employee.lastName}</p>
        </div>
      </div>

      <EmployeeForm
        employee={employee}
        onSuccess={() => navigate('/dashboard/employees')}
      />
    </div>
  )
}
