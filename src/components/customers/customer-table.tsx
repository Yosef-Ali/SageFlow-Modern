'use client'

import { useState } from 'react'
import { MoreHorizontal, Edit, Trash2, RotateCcw } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Customer } from '@prisma/client'
import { CustomerFormDialog } from './customer-form-dialog'
import { useDeleteCustomer, useRestoreCustomer } from '@/hooks/use-customers'
import { CustomersEmptyState } from './customers-empty-state'

interface CustomerTableProps {
  customers: Customer[]
  isLoading?: boolean
}

export function CustomerTable({ customers, isLoading }: CustomerTableProps) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const deleteCustomer = useDeleteCustomer()
  const restoreCustomer = useRestoreCustomer()

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer.mutateAsync(id)
    }
  }

  const handleRestore = async (id: string) => {
    await restoreCustomer.mutateAsync(id)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingCustomer(null)
  }

  const handleAddCustomer = () => {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  if (!isLoading && customers.length === 0) {
    return <CustomersEmptyState onAddCustomer={handleAddCustomer} />
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-mono text-sm">
                  {customer.customerNumber}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    {customer.email && (
                      <div className="text-sm text-slate-500">{customer.email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <span
                    className={
                      Number(customer.balance) > 0
                        ? 'text-red-600 font-medium'
                        : 'text-slate-600'
                    }
                  >
                    {formatCurrency(Number(customer.balance))}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(customer)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {customer.isActive ? (
                        <DropdownMenuItem
                          onClick={() => handleDelete(customer.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleRestore(customer.id)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CustomerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={editingCustomer}
        onClose={handleCloseForm}
      />
    </>
  )
}
