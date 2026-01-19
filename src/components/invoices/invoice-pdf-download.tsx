'use client'

import { useState, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Download, Loader2, Printer, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InvoicePDF, type InvoicePDFData } from './invoice-pdf'
import { getInvoiceForPDF } from '@/app/actions/invoice-pdf-actions'

interface InvoicePDFDownloadProps {
  invoiceId: string
  invoiceNumber?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  iconOnly?: boolean
}

export function InvoicePDFDownload({
  invoiceId,
  invoiceNumber,
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
}: InvoicePDFDownloadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePDF = useCallback(async (): Promise<Blob | null> => {
    setError(null)
    setIsLoading(true)

    try {
      // Fetch invoice data from server
      const result = await getInvoiceForPDF(invoiceId)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invoice data')
      }

      // Generate PDF blob
      const blob = await pdf(<InvoicePDF data={result.data} />).toBlob()
      return blob
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF'
      setError(message)
      console.error('PDF generation error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  const handleDownload = useCallback(async () => {
    const blob = await generatePDF()
    if (!blob) return

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoiceNumber || 'invoice'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [generatePDF, invoiceNumber])

  const handlePrint = useCallback(async () => {
    const blob = await generatePDF()
    if (!blob) return

    // Open PDF in new window for printing
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }, [generatePDF])

  const handlePreview = useCallback(async () => {
    const blob = await generatePDF()
    if (!blob) return

    // Open PDF in new tab for preview
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }, [generatePDF])

  // Icon-only button variant
  if (iconOnly) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading}
            title="Download PDF"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePreview}>
            <FileText className="mr-2 h-4 w-4" />
            Preview
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Standard button with dropdown
  return (
    <div className="flex items-center gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        PDF
      </Button>
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  )
}

// Simple download button without dropdown
export function InvoicePDFDownloadSimple({
  invoiceId,
  invoiceNumber,
  children,
}: {
  invoiceId: string
  invoiceNumber?: string
  children?: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = useCallback(async () => {
    setIsLoading(true)

    try {
      const result = await getInvoiceForPDF(invoiceId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invoice data')
      }

      const blob = await pdf(<InvoicePDF data={result.data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber || 'invoice'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId, invoiceNumber])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        children || (
          <>
            <Download className="h-4 w-4" />
            Download PDF
          </>
        )
      )}
    </Button>
  )
}
