'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, Printer, Download, Loader2, Mail, CreditCard, Copy, ExternalLink, CheckCircle } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoice } from '@/hooks/use-invoices'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoicePDF } from '@/components/invoices/invoice-pdf'
import { getInvoiceForPDF } from '@/app/actions/invoice-pdf-actions'
import { sendInvoiceEmailAction } from '@/app/actions/email-actions'
import { createPaymentLink, checkChapaAvailability } from '@/app/actions/chapa-actions'

interface InvoiceDetailPageProps {
  params: { id: string }
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = params
  const { data: invoice, isLoading, error } = useInvoice(id)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [chapaAvailable, setChapaAvailable] = useState(false)
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  // Check if Chapa is available
  useEffect(() => {
    checkChapaAvailability().then((result) => {
      if (result.success && result.data) {
        setChapaAvailable(result.data.available)
      }
    })
  }, [])

  const handleCreatePaymentLink = useCallback(async () => {
    setPaymentLinkLoading(true)
    try {
      const result = await createPaymentLink(id)
      if (!result.success) {
        alert(result.error || 'Failed to create payment link')
      } else if (result.data) {
        setPaymentLink(result.data.checkoutUrl)
      }
    } catch (err) {
      console.error('Payment link error:', err)
      alert('Failed to create payment link')
    } finally {
      setPaymentLinkLoading(false)
    }
  }, [id])

  const handleCopyLink = useCallback(() => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }, [paymentLink])

  const handleSendEmail = useCallback(async () => {
    setEmailLoading(true)
    try {
      const result = await sendInvoiceEmailAction(id, true)
      if (!result.success) {
        alert(result.error || 'Failed to send email')
      } else {
        alert('Invoice sent successfully!')
      }
    } catch (err) {
      console.error('Email send error:', err)
      alert('Failed to send email')
    } finally {
      setEmailLoading(false)
    }
  }, [id])

  const handleDownloadPDF = useCallback(async () => {
    if (!invoice) return
    setPdfLoading(true)
    try {
      const result = await getInvoiceForPDF(id)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invoice data')
      }

      const blob = await pdf(<InvoicePDF data={result.data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setPdfLoading(false)
    }
  }, [id, invoice])

  const handlePrintPDF = useCallback(async () => {
    if (!invoice) return
    setPdfLoading(true)
    try {
      const result = await getInvoiceForPDF(id)
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
      setPdfLoading(false)
    }
  }, [id, invoice])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Invoice not found</p>
          <Link href="/dashboard/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = Number(invoice.subtotal)
  const taxAmount = Number(invoice.taxAmount)
  const total = Number(invoice.total)
  const paidAmount = Number(invoice.paidAmount)
  const balance = total - paidAmount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-slate-500">
              Created on {formatDate(new Date(invoice.createdAt))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <>
              <Link href={`/dashboard/invoices/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </>
          )}
          {!['PAID', 'CANCELLED'].includes(invoice.status) && (
            <Button onClick={handleSendEmail} disabled={emailLoading}>
              {emailLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrintPDF} disabled={pdfLoading}>
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white p-8 rounded-lg border border-slate-200 space-y-8">
        {/* Header Section */}
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">INVOICE</h2>
            <p className="text-lg font-mono text-slate-600">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Invoice Date</p>
            <p className="font-medium">{formatDate(new Date(invoice.date))}</p>
            <p className="text-sm text-slate-500 mt-2">Due Date</p>
            <p className="font-medium">{formatDate(new Date(invoice.dueDate))}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="border-t pt-6">
          <p className="text-sm text-slate-500 mb-1">Bill To</p>
          <p className="font-semibold text-lg">{invoice.customer?.name}</p>
          {invoice.customer?.email && (
            <p className="text-slate-600">{invoice.customer.email}</p>
          )}
          {invoice.customer?.phone && (
            <p className="text-slate-600">{invoice.customer.phone}</p>
          )}
        </div>

        {/* Line Items */}
        <div className="border-t pt-6">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 text-sm font-medium text-slate-500">Description</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Qty</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Unit Price</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">VAT</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-right">{Number(item.quantity)}</td>
                  <td className="py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="py-3 text-right">{(Number(item.taxRate) * 100).toFixed(0)}%</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">VAT (15%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {paidAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Amount Paid:</span>
                  <span>-{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Balance Due:</span>
                  <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="border-t pt-6 grid grid-cols-2 gap-8">
            {invoice.notes && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Notes</p>
                <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Terms & Conditions</p>
                <p className="text-slate-700 whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chapa Payment Section */}
      {chapaAvailable && !['PAID', 'CANCELLED'].includes(invoice.status) && balance > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Online Payment
              </h3>
              <p className="text-purple-700 text-sm mt-1">
                Accept payment via Telebirr, CBE Birr, M-Pesa, or Card
              </p>
            </div>
            {!paymentLink ? (
              <Button
                onClick={handleCreatePaymentLink}
                disabled={paymentLinkLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {paymentLinkLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Generate Payment Link
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    {linkCopied ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open(paymentLink, '_blank')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Payment Page
                  </Button>
                </div>
                <p className="text-xs text-purple-600">
                  Share this link with your customer to receive payment
                </p>
              </div>
            )}
          </div>
          {paymentLink && (
            <div className="mt-4 p-3 bg-white/50 rounded border border-purple-200">
              <p className="text-xs text-purple-600 mb-1">Payment Link:</p>
              <code className="text-xs text-purple-800 break-all">{paymentLink}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
