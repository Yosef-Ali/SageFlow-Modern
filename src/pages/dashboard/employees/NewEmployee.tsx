import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmployeeForm } from '@/components/employees/employee-form'

export default function NewEmployeePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Employee</h1>
          <p className="text-muted-foreground mt-1">Add a new employee to the system</p>
        </div>
      </div>

      <EmployeeForm />
    </div>
  )
}
