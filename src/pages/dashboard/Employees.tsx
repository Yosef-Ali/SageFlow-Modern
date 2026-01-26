import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardHeader } from '@/components/dashboard/header'

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Employees"
        text="Manage your team members and payroll"
      >
        <Link to="/dashboard/employees/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </Link>
      </DashboardHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search employees..." className="pl-10" />
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">No employees found</p>
        <p className="text-slate-400 text-sm mt-1">Add your first employee to get started</p>
        <Link to="/dashboard/employees/new">
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </Link>
      </div>
    </div>
  )
}
