'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, Mail, Phone, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEmployees, useDeleteEmployee } from '@/hooks/use-employees'
import { formatCurrency } from '@/lib/utils'

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const { data: employees, isLoading, error } = useEmployees({ search })
  const deleteEmployee = useDeleteEmployee()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this employee?')) {
      await deleteEmployee.mutateAsync(id)
    }
  }

  if (isLoading) {
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          heading="Employees"
          text="Manage your team members and payroll"
        />
        <div className="text-center py-20 text-destructive">
          Failed to load employees
        </div>
      </div>
    )
  }

  const activeEmployees = employees?.filter(e => e.is_active !== false) || []

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
        <Input
          placeholder="Search employees..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Employee List */}
      {activeEmployees.length === 0 ? (
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Pay Rate</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-700 font-medium text-sm">
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                          <p className="text-xs text-muted-foreground">{employee.employee_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{employee.department || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{employee.job_title || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {employee.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {employee.email}
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">{formatCurrency(employee.pay_rate || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          {employee.pay_method === 'SALARY' ? '/month' : '/day'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/dashboard/employees/${employee.id}/edit`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(employee.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {activeEmployees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{activeEmployees.length}</div>
              <p className="text-xs text-muted-foreground">Total Employees</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {activeEmployees.filter(e => e.pay_method === 'SALARY').length}
              </div>
              <p className="text-xs text-muted-foreground">Salaried</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {activeEmployees.filter(e => e.pay_method === 'DAILY').length}
              </div>
              <p className="text-xs text-muted-foreground">Daily Workers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {new Set(activeEmployees.map(e => e.department).filter(Boolean)).size}
              </div>
              <p className="text-xs text-muted-foreground">Departments</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
