'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  invoiceSchema,
  invoiceFiltersSchema,
  calculateInvoiceTotals,
  type InvoiceFormValues,
  type InvoiceFiltersValues,
} from '@/lib/validations/invoice'
import { Prisma, InvoiceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Generate the next invoice number for a company
 * Format: INV-001, INV-002, etc.
 */
async function generateInvoiceNumber(companyId: string): Promise<string> {
  const lastInvoice = await prisma.invoice.findFirst({
    where: { companyId },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  if (!lastInvoice) {
    return 'INV-001'
  }

  // Extract the numeric part and increment
  const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1] || '0', 10)
  const nextNumber = lastNumber + 1

  // Pad with zeros to ensure 3 digits minimum
  return `INV-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Get list of invoices with filters and pagination
 */
export async function getInvoices(
  filters?: Partial<InvoiceFiltersValues>
): Promise<ActionResult<{ invoices: any[]; total: number }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate and parse filters
    const validatedFilters = invoiceFiltersSchema.parse(filters || {})

    // Build where clause
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(validatedFilters.status && validatedFilters.status !== 'all' && {
        status: validatedFilters.status as InvoiceStatus,
      }),
      ...(validatedFilters.customerId && { customerId: validatedFilters.customerId }),
      ...(validatedFilters.dateFrom && { date: { gte: validatedFilters.dateFrom } }),
      ...(validatedFilters.dateTo && { date: { lte: validatedFilters.dateTo } }),
      ...(validatedFilters.search && {
        OR: [
          { invoiceNumber: { contains: validatedFilters.search, mode: 'insensitive' } },
          { customer: { name: { contains: validatedFilters.search, mode: 'insensitive' } } },
        ],
      }),
    }

    // Build orderBy
    const orderBy: Prisma.InvoiceOrderByWithRelationInput = {
      [validatedFilters.sortBy || 'createdAt']: validatedFilters.sortOrder || 'desc',
    }

    // Get total count
    const total = await prisma.invoice.count({ where })

    // Get invoices with customer info
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy,
      skip: ((validatedFilters.page || 1) - 1) * (validatedFilters.limit || 20),
      take: validatedFilters.limit || 20,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return {
      success: true,
      data: {
        invoices,
        total,
      },
    }
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices',
    }
  }
}

/**
 * Get a single invoice by ID with items
 */
export async function getInvoice(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
        companyId, // Security: Ensure invoice belongs to user's company
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        customer: {
          select: {
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

    return {
      success: true,
      data: invoice,
    }
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    }
  }
}

/**
 * Create a new invoice with line items
 */
export async function createInvoice(
  data: InvoiceFormValues
): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate data
    const validatedData = invoiceSchema.parse(data)

    // Calculate totals
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(validatedData.items)

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(companyId)

    // Create invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          companyId,
          customerId: validatedData.customerId,
          invoiceNumber,
          date: validatedData.date,
          dueDate: validatedData.dueDate,
          subtotal,
          taxAmount,
          total,
          status: validatedData.status,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
        },
      })

      // Create invoice items
      for (const item of validatedData.items) {
        const lineTotal = item.quantity * item.unitPrice * (1 + (item.taxRate ?? 0.15))
        await tx.invoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            itemId: item.itemId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? 0.15,
            total: lineTotal,
          },
        })
      }

      return newInvoice
    })

    revalidatePath('/invoices')

    return {
      success: true,
      data: invoice,
    }
  } catch (error) {
    console.error('Error creating invoice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    }
  }
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
  id: string,
  data: InvoiceFormValues
): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate data
    const validatedData = invoiceSchema.parse(data)

    // Verify ownership
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { companyId: true, status: true },
    })

    if (!existingInvoice || existingInvoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice not found or access denied',
      }
    }

    // Prevent editing paid or cancelled invoices
    if (['PAID', 'CANCELLED'].includes(existingInvoice.status)) {
      return {
        success: false,
        error: 'Cannot edit a paid or cancelled invoice',
      }
    }

    // Calculate totals
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(validatedData.items)

    // Update invoice with items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          customerId: validatedData.customerId,
          date: validatedData.date,
          dueDate: validatedData.dueDate,
          subtotal,
          taxAmount,
          total,
          status: validatedData.status,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
        },
      })

      // Delete existing items and recreate
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      })

      // Create new invoice items
      for (const item of validatedData.items) {
        const lineTotal = item.quantity * item.unitPrice * (1 + (item.taxRate ?? 0.15))
        await tx.invoiceItem.create({
          data: {
            invoiceId: id,
            itemId: item.itemId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? 0.15,
            total: lineTotal,
          },
        })
      }

      return updatedInvoice
    })

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)

    return {
      success: true,
      data: invoice,
    }
  } catch (error) {
    console.error('Error updating invoice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update invoice',
    }
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    // Verify ownership
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!existingInvoice || existingInvoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice not found or access denied',
      }
    }

    await prisma.invoice.update({
      where: { id },
      data: { status },
    })

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error updating invoice status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update invoice status',
    }
  }
}

/**
 * Cancel an invoice
 */
export async function cancelInvoice(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { companyId: true, paidAmount: true },
    })

    if (!existingInvoice || existingInvoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice not found or access denied',
      }
    }

    // Prevent cancelling invoices with payments
    if (existingInvoice.paidAmount.toNumber() > 0) {
      return {
        success: false,
        error: 'Cannot cancel an invoice with recorded payments',
      }
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    revalidatePath('/invoices')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error cancelling invoice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel invoice',
    }
  }
}

/**
 * Get customers for dropdown (simplified)
 */
export async function getCustomersForDropdown(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const customers = await prisma.customer.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        customerNumber: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      data: customers,
    }
  } catch (error) {
    console.error('Error fetching customers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customers',
    }
  }
}

/**
 * Get items for dropdown (simplified)
 */
export async function getItemsForDropdown(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const items = await prisma.item.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      success: true,
      data: items,
    }
  } catch (error) {
    console.error('Error fetching items:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch items',
    }
  }
}
