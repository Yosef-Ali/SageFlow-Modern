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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { type SerializedCustomer } from '@/types/customer'
import { paymentTerms } from '@/lib/validations/customer'
import { CustomerFormDialog } from './customer-form-dialog'
import { useDeleteCustomer, useRestoreCustomer } from '@/hooks/use-customers'
import { CustomersEmptyState } from './customers-empty-state'

interface CustomerTableProps {
  customers: SerializedCustomer[]
  isLoading?: boolean
}

export function CustomerTable({ customers, isLoading }: CustomerTableProps) {
  const [editingCustomer, setEditingCustomer] = useState<SerializedCustomer | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)
  const deleteCustomer = useDeleteCustomer()
  const restoreCustomer = useRestoreCustomer()

  const handleEdit = (customer: SerializedCustomer) => {
    setEditingCustomer(customer)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingCustomerId(id)
  }

  const handleDeleteConfirm = async () => {
    if (deletingCustomerId) {
      await deleteCustomer.mutateAsync(deletingCustomerId)
      setDeletingCustomerId(null)
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

  // Helper to get payment terms label
  const getTermsLabel = (terms: string | undefined) => {
    const term = paymentTerms.find(t => t.value === terms)
    return term?.label || 'Net 30'
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Terms</TableHead>
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
                    {(customer as any).contactName && (
                      <div className="text-xs text-slate-500">{(customer as any).contactName}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {customer.email || '-'}
                </TableCell>
                <TableCell className="text-sm">{customer.phone || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {getTermsLabel((customer as any).paymentTerms)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      customer.balance > 0
                        ? 'text-red-600 font-medium'
                        : 'text-slate-600'
                    }
                  >
                    {formatCurrency(customer.balance)}
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
                          onClick={() => handleDeleteClick(customer.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate
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

      <AlertDialog open={!!deletingCustomerId} onOpenChange={(open) => !open && setDeletingCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the customer as inactive. They won't appear in selection lists for new invoices, but all their history will be preserved. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

