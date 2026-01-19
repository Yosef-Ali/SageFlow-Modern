'use server'

import { db } from '@/db'
import { invoices, invoiceItems, customers, companies } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import type { InvoicePDFData } from '@/components/invoices/invoice-pdf'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get invoice data formatted for PDF generation
 * Includes invoice, items, customer, and company information
 */
export async function getInvoiceForPDF(
  invoiceId: string
): Promise<ActionResult<InvoicePDFData>> {
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

    return {
      success: true,
      data: pdfData,
    }
  } catch (error) {
    console.error('Error fetching invoice for PDF:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice data',
    }
  }
}

/**
 * Get multiple invoices for bulk PDF generation
 */
export async function getInvoicesForPDF(
  invoiceIds: string[]
): Promise<ActionResult<InvoicePDFData[]>> {
  try {
    const results: InvoicePDFData[] = []

    for (const id of invoiceIds) {
      const result = await getInvoiceForPDF(id)
      if (result.success && result.data) {
        results.push(result.data)
      }
    }

    return {
      success: true,
      data: results,
    }
  } catch (error) {
    console.error('Error fetching invoices for PDF:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices data',
    }
  }
}
