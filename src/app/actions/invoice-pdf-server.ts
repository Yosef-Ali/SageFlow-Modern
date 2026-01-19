'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { db } from '@/db'
import { invoices, companies } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import React from 'react'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// Invoice PDF data type (matches the client-side type)
interface InvoicePDFData {
  invoice: {
    id: string
    invoiceNumber: string
    date: Date | string
    dueDate: Date | string
    subtotal: string | number
    taxAmount: string | number
    discountAmount: string | number
    total: string | number
    paidAmount: string | number
    status: string
    notes?: string | null
    terms?: string | null
  }
  items: Array<{
    id: string
    description: string
    quantity: string | number
    unitPrice: string | number
    taxRate: string | number
    total: string | number
    item?: {
      name: string
      sku?: string
    } | null
  }>
  customer: {
    name: string
    email?: string | null
    phone?: string | null
    billingAddress?: unknown
  }
  company: {
    name: string
    email: string
    phone?: string | null
    address?: string | null
    taxId?: string | null
  }
}

/**
 * Generate invoice PDF as a Buffer for email attachments
 */
export async function generateInvoicePdfBuffer(
  invoiceId: string
): Promise<ActionResult<Buffer>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Get invoice with items and customer
    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, companyId)
      ),
      with: {
        items: {
          with: {
            item: {
              columns: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        customer: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            billingAddress: true,
          },
        },
      },
    })

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      }
    }

    // Get company information
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxId: true,
      },
    })

    if (!company) {
      return {
        success: false,
        error: 'Company not found',
      }
    }

    // Format the data for PDF
    const pdfData: InvoicePDFData = {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        dueDate: invoice.dueDate,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        discountAmount: invoice.discountAmount,
        total: invoice.total,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        notes: invoice.notes,
        terms: invoice.terms,
      },
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        total: item.total,
        item: item.item
          ? {
              name: item.item.name,
              sku: item.item.sku ?? undefined,
            }
          : null,
      })),
      customer: {
        name: invoice.customer?.name || 'Unknown Customer',
        email: invoice.customer?.email,
        phone: invoice.customer?.phone,
        billingAddress: invoice.customer?.billingAddress,
      },
      company: {
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        taxId: company.taxId,
      },
    }

    // Dynamically import the PDF component to avoid SSR issues
    const { createInvoicePDFDocument } = await import('@/components/invoices/invoice-pdf-server')

    // Generate PDF buffer
    const pdfDocument = createInvoicePDFDocument(pdfData)
    const buffer = await renderToBuffer(pdfDocument)

    return {
      success: true,
      data: Buffer.from(buffer),
    }
  } catch (error) {
    console.error('Error generating invoice PDF buffer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    }
  }
}
