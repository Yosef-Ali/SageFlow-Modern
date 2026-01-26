import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Printer, Mail, Edit, Trash2, FileText, Calendar, User, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { useInvoice, useDeleteInvoice } from '@/hooks/use-invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useState } from 'react'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: invoice, isLoading, error } = useInvoice(id || '')
  const deleteInvoice = useDeleteInvoice()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleConfirmDelete = async () => {
    await deleteInvoice.mutateAsync(id!)
    setShowDeleteConfirm(false)
    navigate('/dashboard/invoices')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
        <Button onClick={() => navigate('/dashboard/invoices')}>Back to Invoices</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground mt-1">Created on {formatDate(invoice.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Separator orientation="vertical" className="h-8 mx-1 hidden md:block" />
          {invoice.status === 'DRAFT' && (
            <>
              <Link to={`/dashboard/invoices/${invoice.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete invoice {invoice.invoiceNumber}
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.unitPrice))}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(item.total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-2 ml-auto max-w-[200px]">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT:</span>
                  <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-emerald-500">{formatCurrency(Number(invoice.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{invoice.customer?.name || 'Unknown Customer'}</p>
                  <p className="text-sm text-muted-foreground">Customer ID: {invoice.customer?.customerNumber || 'N/A'}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Due Date
                  </div>
                  <span className="text-foreground">{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Terms
                  </div>
                  <span className="text-foreground">{invoice.terms || 'Net 30'}</span>
                </div>
                {invoice.poNumber && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <div className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      PO Number
                    </div>
                    <span className="text-foreground">{invoice.poNumber}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {Number(invoice.paidAmount) > 0 && (
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardHeader>
                <CardTitle className="text-sm text-emerald-600 dark:text-emerald-400 uppercase">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Paid Amount:</span>
                  <span className="font-medium">{formatCurrency(Number(invoice.paidAmount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Outstanding:</span>
                  <span className="font-bold text-red-500">{formatCurrency(Number(invoice.total) - Number(invoice.paidAmount))}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
