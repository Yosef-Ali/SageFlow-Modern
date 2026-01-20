'use client'

import Link from 'next/link'
import { Eye, Edit, MoreHorizontal } from 'lucide-react'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface PurchaseOrder {
  id: string
  poNumber: string
  date: Date
  expectedDate?: Date | null
  totalAmount: number | string
  status: string
  vendor: {
    name: string
  }
}

export function PurchaseOrderTable({ purchaseOrders }: { purchaseOrders: PurchaseOrder[] }) {
  if (purchaseOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-lg border">
        <h3 className="text-lg font-medium text-foreground mb-1">No Purchase Orders</h3>
        <p className="text-slate-500 mb-4">Get started by creating your first PO</p>
        <Link href="/dashboard/purchases/orders/new">
          <Button>Create Purchase Order</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.map((po) => (
            <TableRow key={po.id}>
              <TableCell className="font-mono text-sm font-medium">
                {po.poNumber}
              </TableCell>
              <TableCell>{po.vendor.name}</TableCell>
              <TableCell>{formatDate(new Date(po.date))}</TableCell>
              <TableCell>
                {po.expectedDate ? formatDate(new Date(po.expectedDate)) : '-'}
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(Number(po.totalAmount))}
              </TableCell>
              <TableCell>
                <Badge variant={po.status === 'OPEN' ? 'default' : 'secondary'}>
                  {po.status}
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
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/purchases/orders/${po.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    {po.status === 'DRAFT' && (
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/purchases/orders/${po.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
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
  )
}
