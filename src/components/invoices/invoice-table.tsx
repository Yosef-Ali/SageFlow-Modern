
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Eye, Edit, XCircle, Send, FileText, Download, Printer, Loader2, Mail, Clock, CreditCard, Trash2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
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
  DropdownMenuSeparator,
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
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatusBadge } from './invoice-status-badge'
import { useCancelInvoice, useUpdateInvoiceStatus, useDeleteInvoice } from '@/hooks/use-invoices'
import { InvoiceStatus } from '@/db/schema'
import { InvoicePDF } from './invoice-pdf'
import { getInvoiceForPDF } from '@/app/actions/invoice-pdf-actions'
import { sendInvoiceEmailAction, sendPaymentReminderAction } from '@/app/actions/email-actions'
import { createPaymentLink } from '@/app/actions/chapa-actions'

interface Invoice {
  id: string
  invoiceNumber: string
  date: string | Date
  dueDate: string | Date
  total: number | string
  paidAmount: number | string
  status: InvoiceStatus
  customer: {
    id: string
    name: string
  } | null | { name: string } // Allow for loose typing or null
}

interface InvoiceTableProps {
  invoices: Invoice[]
  isLoading?: boolean
}

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  const cancelInvoice = useCancelInvoice()
  const updateStatus = useUpdateInvoiceStatus()
  const deleteInvoice = useDeleteInvoice()
  const { toast } = useToast()
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  const handleCancelClick = (id: string) => {
    setConfirmCancelId(id)
  }

  const handleConfirmCancel = async () => {
    if (confirmCancelId) {
      await cancelInvoice.mutateAsync(confirmCancelId)
      setConfirmCancelId(null)
    }
  }

  const handleMarkSent = async (id: string) => {
    await updateStatus.mutateAsync({ id, status: 'SENT' })
  }

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      await deleteInvoice.mutateAsync(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  const handleSendEmail = useCallback(async (invoiceId: string) => {
    setEmailLoading(invoiceId)
    try {
      const result = await sendInvoiceEmailAction(invoiceId, true)
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send email',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Invoice sent successfully!',
        })
      }
    } catch (err) {
      console.error('Email send error:', err)
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive',
      })
    } finally {
      setEmailLoading(null)
    }
  }, [toast])

  const handleSendReminder = useCallback(async (invoiceId: string) => {
    setEmailLoading(invoiceId)
    try {
      const result = await sendPaymentReminderAction(invoiceId)
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send reminder',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Payment reminder sent!',
        })
      }
    } catch (err) {
      console.error('Reminder send error:', err)
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      })
    } finally {
      setEmailLoading(null)
    }
  }, [toast])

  const handleGetPaymentLink = useCallback(async (invoiceId: string) => {
    setEmailLoading(invoiceId)
    try {
      const result = await createPaymentLink(invoiceId)
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create payment link',
          variant: 'destructive',
        })
      } else if (result.data) {
        await navigator.clipboard.writeText(result.data.checkoutUrl)
        toast({
          title: 'Success',
          description: 'Payment link copied to clipboard!',
        })
      }
    } catch (err) {
      console.error('Payment link error:', err)
      toast({
        title: 'Error',
        description: 'Failed to create payment link',
        variant: 'destructive',
      })
    } finally {
      setEmailLoading(null)
    }
  }, [toast])

  const handleDownloadPDF = useCallback(async (invoiceId: string, invoiceNumber: string) => {
    setPdfLoading(invoiceId)
    try {
      const result = await getInvoiceForPDF(invoiceId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invoice data')
      }

      const blob = await pdf(<InvoicePDF data={result.data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setPdfLoading(null)
    }
  }, [])

  const handlePrintPDF = useCallback(async (invoiceId: string) => {
    setPdfLoading(invoiceId)
    try {
      const result = await getInvoiceForPDF(invoiceId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invoice data')
      }

      const blob = await pdf(<InvoicePDF data={result.data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => printWindow.print()
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) {
      console.error('PDF print error:', err)
    } finally {
      setPdfLoading(null)
    }
  }, [])

  if (!isLoading && invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-lg border">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No invoices yet</h3>
        <p className="text-muted-foreground mb-4">Get started by creating your first invoice</p>
        <Link to="/dashboard/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const total = Number(invoice.total)
            const paidAmount = Number(invoice.paidAmount)
            const isOverdue = new Date(invoice.dueDate) < new Date() && 
                             !['PAID', 'CANCELLED'].includes(invoice.status)

            return (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-sm font-medium">
                  <Link 
                    to={`/dashboard/invoices/${invoice.id}`}
                    className="text-emerald-500 hover:text-emerald-600 hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{invoice.customer?.name || 'Unknown'}</TableCell>
                <TableCell>{formatDate(invoice.date)}</TableCell>
                <TableCell className={isOverdue ? 'text-red-600' : ''}>
                  {formatDate(invoice.dueDate)}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{formatCurrency(total)}</div>
                    {paidAmount > 0 && paidAmount < total && (
                      <div className="text-xs text-muted-foreground">
                        Paid: {formatCurrency(paidAmount)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={pdfLoading === invoice.id || emailLoading === invoice.id}>
                        {pdfLoading === invoice.id || emailLoading === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/dashboard/invoices/${invoice.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                        disabled={pdfLoading === invoice.id}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePrintPDF(invoice.id)}
                        disabled={pdfLoading === invoice.id}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!['PAID', 'CANCELLED'].includes(invoice.status) && (
                        <DropdownMenuItem
                          onClick={() => handleSendEmail(invoice.id)}
                          disabled={emailLoading === invoice.id}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                      )}
                      {isOverdue && (
                        <DropdownMenuItem
                          onClick={() => handleSendReminder(invoice.id)}
                          disabled={emailLoading === invoice.id}
                          className="text-amber-600"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Send Reminder
                        </DropdownMenuItem>
                      )}
                      {!['PAID', 'CANCELLED'].includes(invoice.status) && (
                        <DropdownMenuItem
                          onClick={() => handleGetPaymentLink(invoice.id)}
                          disabled={emailLoading === invoice.id}
                          className="text-purple-600"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Get Payment Link
                        </DropdownMenuItem>
                      )}
                      {invoice.status === 'DRAFT' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={`/dashboard/invoices/${invoice.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkSent(invoice.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Mark as Sent
                          </DropdownMenuItem>
                        </>
                      )}
                      {!['PAID', 'CANCELLED'].includes(invoice.status) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCancelClick(invoice.id)}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </>
                      )}
                      {(invoice.status === 'DRAFT' || (invoice.status === 'SENT' && Number(invoice.paidAmount) === 0)) && (
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(invoice.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice
              and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmCancelId} onOpenChange={(open) => !open && setConfirmCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invoice? This will mark it as cancelled
              but keep the record in your system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep It</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Yes, Cancel Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
