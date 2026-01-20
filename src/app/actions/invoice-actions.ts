'use server'

import { db } from '@/db'
import { invoices, invoiceItems, customers, items, stockMovements, InvoiceStatus } from '@/db/schema'
import { eq, and, or, ilike, gte, lte, desc, asc, count, sql } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import {
  invoiceSchema,
  invoiceFiltersSchema,
  calculateInvoiceTotals,
  type InvoiceFormValues,
  type InvoiceFiltersValues,
} from '@/lib/validations/invoice'
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
  const lastInvoice = await db.query.invoices.findFirst({
    where: eq(invoices.companyId, companyId),
    orderBy: desc(invoices.invoiceNumber),
    columns: { invoiceNumber: true },
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

    // Build where conditions
    const conditions = [eq(invoices.companyId, companyId)]

    if (validatedFilters.status && validatedFilters.status !== 'all') {
      conditions.push(eq(invoices.status, validatedFilters.status as InvoiceStatus))
    }

    if (validatedFilters.customerId) {
      conditions.push(eq(invoices.customerId, validatedFilters.customerId))
    }

    if (validatedFilters.dateFrom) {
      conditions.push(gte(invoices.date, validatedFilters.dateFrom))
    }

    if (validatedFilters.dateTo) {
      conditions.push(lte(invoices.date, validatedFilters.dateTo))
    }

    if (validatedFilters.search) {
      const searchTerm = `%${validatedFilters.search}%`
      conditions.push(
        or(
          ilike(invoices.invoiceNumber, searchTerm)
        )!
      )
    }

    const whereClause = and(...conditions)

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(invoices)
      .where(whereClause)

    // Build orderBy - use a type-safe column map
    const sortableColumns = {
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      dueDate: invoices.dueDate,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    } as const

    const sortField = validatedFilters.sortBy || 'createdAt'
    const sortOrder = validatedFilters.sortOrder || 'desc'
    const orderByColumn = sortableColumns[sortField as keyof typeof sortableColumns] ?? invoices.createdAt
    const orderBy = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)

    // Get invoices with customer info
    const limit = validatedFilters.limit || 20
    const page = validatedFilters.page || 1
    const offset = (page - 1) * limit

    const invoiceList = await db.query.invoices.findMany({
      where: whereClause,
      orderBy,
      limit,
      offset,
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    })

    return {
      success: true,
      data: {
        invoices: invoiceList,
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

    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, id),
        eq(invoices.companyId, companyId) // Security: Ensure invoice belongs to user's company
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
 * Check if invoice would exceed customer credit limit
 * Returns warning message if exceeded, null if OK
 */
export async function checkCreditLimit(
  customerId: string,
  invoiceTotal: number
): Promise<ActionResult<{ exceeded: boolean; message?: string; currentBalance: number; creditLimit: number; newBalance: number }>> {
  try {
    const companyId = await getCurrentCompanyId()

    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.companyId, companyId)
      ),
      columns: {
        name: true,
        balance: true,
        creditLimit: true,
      },
    })

    if (!customer) {
      return { success: false, error: 'Customer not found' }
    }

    const currentBalance = Number(customer.balance)
    const creditLimit = Number(customer.creditLimit || 0)
    const newBalance = currentBalance + invoiceTotal

    // Credit limit of 0 means unlimited
    if (creditLimit === 0) {
      return {
        success: true,
        data: {
          exceeded: false,
          currentBalance,
          creditLimit,
          newBalance,
        },
      }
    }

    const exceeded = newBalance > creditLimit

    return {
      success: true,
      data: {
        exceeded,
        message: exceeded
          ? `Credit limit exceeded for ${customer.name}. Current balance: ETB ${currentBalance.toFixed(2)}, Credit limit: ETB ${creditLimit.toFixed(2)}, New balance would be: ETB ${newBalance.toFixed(2)}`
          : undefined,
        currentBalance,
        creditLimit,
        newBalance,
      },
    }
  } catch (error) {
    console.error('Error checking credit limit:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check credit limit',
    }
  }
}

/**
 * Create a new invoice with line items
 */
export async function createInvoice(
  data: InvoiceFormValues,
  options?: { skipCreditCheck?: boolean }
): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate data
    const validatedData = invoiceSchema.parse(data)

    // Calculate totals
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(validatedData.items)

    // Check credit limit for non-DRAFT invoices (unless skipped)
    if (validatedData.status !== 'DRAFT' && !options?.skipCreditCheck) {
      const creditCheck = await checkCreditLimit(validatedData.customerId, total)
      if (creditCheck.success && creditCheck.data?.exceeded) {
        return {
          success: false,
          error: creditCheck.data.message || 'Credit limit exceeded',
        }
      }
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(companyId)

    // Create invoice with items in a transaction
    const invoice = await db.transaction(async (tx) => {
      // Create invoice
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          companyId,
          customerId: validatedData.customerId,
          invoiceNumber,
          date: validatedData.date,
          dueDate: validatedData.dueDate,
          subtotal: String(subtotal),
          taxAmount: String(taxAmount),
          total: String(total),
          status: validatedData.status,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
          // Peachtree fields
          salesRepId: validatedData.salesRepId || null,
          poNumber: validatedData.poNumber || null,
          shipMethod: validatedData.shipMethod || null,
          shipDate: validatedData.shipDate || null,
          dropShip: validatedData.dropShip,
        })
        .returning()

      // Create invoice items and deduct stock
      for (const item of validatedData.items) {
        const lineTotal = item.quantity * item.unitPrice * (1 + (item.taxRate ?? 0.15))
        await tx.insert(invoiceItems).values({
          invoiceId: newInvoice.id,
          itemId: item.itemId || null,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          taxRate: String(item.taxRate ?? 0.15),
          total: String(lineTotal),
        })

        // Deduct stock for non-DRAFT invoices
        if (validatedData.status !== 'DRAFT' && item.itemId) {
          // Update quantity on hand
          await tx.update(items)
            .set({
              quantityOnHand: sql`${items.quantityOnHand} - ${item.quantity}`,
              updatedAt: new Date()
            })
            .where(eq(items.id, item.itemId))

          // Log stock movement
          await tx.insert(stockMovements).values({
            itemId: item.itemId,
            type: 'SALE',
            quantity: String(-item.quantity), // Negative for sales
            cost: String(item.unitPrice),
            referenceType: 'INVOICE',
            referenceId: newInvoice.id,
            date: validatedData.date,
          })
        }
      }

      // Update Customer Balance (Increase AR) for non-DRAFT invoices
      if (validatedData.status !== 'DRAFT') {
        await tx.update(customers)
          .set({
            balance: sql`${customers.balance} + ${total}`,
            updatedAt: new Date()
          })
          .where(eq(customers.id, validatedData.customerId))
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
    const existingInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      columns: { companyId: true, status: true },
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
    const invoice = await db.transaction(async (tx) => {
      // Update invoice
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          customerId: validatedData.customerId,
          date: validatedData.date,
          dueDate: validatedData.dueDate,
          subtotal: String(subtotal),
          taxAmount: String(taxAmount),
          total: String(total),
          status: validatedData.status,
          notes: validatedData.notes || null,
          terms: validatedData.terms || null,
          updatedAt: new Date(),
          // Peachtree fields
          salesRepId: validatedData.salesRepId || null,
          poNumber: validatedData.poNumber || null,
          shipMethod: validatedData.shipMethod || null,
          shipDate: validatedData.shipDate || null,
          dropShip: validatedData.dropShip,
        })
        .where(eq(invoices.id, id))
        .returning()

      // Delete existing items and recreate
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id))

      // Create new invoice items
      for (const item of validatedData.items) {
        const lineTotal = item.quantity * item.unitPrice * (1 + (item.taxRate ?? 0.15))
        await tx.insert(invoiceItems).values({
          invoiceId: id,
          itemId: item.itemId || null,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          taxRate: String(item.taxRate ?? 0.15),
          total: String(lineTotal),
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
 * Update invoice status (handles balance/stock when changing from DRAFT to SENT)
 */
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  options?: { skipCreditCheck?: boolean }
): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    // Get full invoice data for balance/stock updates
    const existingInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      columns: { companyId: true, status: true, customerId: true, total: true },
      with: { items: true }
    })

    if (!existingInvoice || existingInvoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice not found or access denied',
      }
    }

    const wasDraft = existingInvoice.status === 'DRAFT'
    const isNowActive = status === 'SENT' || status === 'OVERDUE'

    // Check credit limit when activating a DRAFT invoice
    if (wasDraft && isNowActive && !options?.skipCreditCheck) {
      const creditCheck = await checkCreditLimit(
        existingInvoice.customerId,
        Number(existingInvoice.total)
      )
      if (creditCheck.success && creditCheck.data?.exceeded) {
        return {
          success: false,
          error: creditCheck.data.message || 'Credit limit exceeded',
        }
      }
    }

    await db.transaction(async (tx) => {
      // Update status
      await tx
        .update(invoices)
        .set({ status, updatedAt: new Date() })
        .where(eq(invoices.id, id))

      // If changing from DRAFT to an active status, update balance and stock
      if (wasDraft && isNowActive) {
        console.log('[Invoice Status Change] DRAFT -> SENT detected')
        console.log('[Invoice Status Change] Updating customer balance:', {
          customerId: existingInvoice.customerId,
          total: existingInvoice.total,
          itemsCount: existingInvoice.items.length
        })

        // Update customer balance (+AR)
        await tx.update(customers)
          .set({
            balance: sql`${customers.balance} + ${Number(existingInvoice.total)}`,
            updatedAt: new Date()
          })
          .where(eq(customers.id, existingInvoice.customerId))

        console.log('[Invoice Status Change] Customer balance updated')

        // Deduct stock for each item
        for (const item of existingInvoice.items) {
          if (item.itemId) {
            await tx.update(items)
              .set({
                quantityOnHand: sql`${items.quantityOnHand} - ${Number(item.quantity)}`,
                updatedAt: new Date()
              })
              .where(eq(items.id, item.itemId))

            await tx.insert(stockMovements).values({
              itemId: item.itemId,
              type: 'SALE',
              quantity: String(-Number(item.quantity)),
              cost: String(item.unitPrice),
              referenceType: 'INVOICE',
              referenceId: id,
              date: new Date(),
            })
          }
        }
      } else {
        console.log('[Invoice Status Change] Not a DRAFT->SENT change:', {
          wasDraft,
          isNowActive,
          currentStatus: existingInvoice.status,
          newStatus: status
        })
      }
    })

    revalidatePath('/dashboard/invoices')
    revalidatePath(`/dashboard/invoices/${id}`)
    revalidatePath('/dashboard/customers')

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
 * Cancel an invoice (and reverse balance/stock updates)
 */
export async function cancelInvoice(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const existingInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      columns: { companyId: true, paidAmount: true, status: true, customerId: true, total: true },
      with: { items: true }
    })

    if (!existingInvoice || existingInvoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice not found or access denied',
      }
    }

    // Prevent cancelling invoices with payments
    if (Number(existingInvoice.paidAmount) > 0) {
      return {
        success: false,
        error: 'Cannot cancel an invoice with recorded payments',
      }
    }

    await db.transaction(async (tx) => {
      // Cancel the invoice
      await tx
        .update(invoices)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(eq(invoices.id, id))

      // Reverse customer balance only if it was not DRAFT
      if (existingInvoice.status !== 'DRAFT') {
        await tx.update(customers)
          .set({
            balance: sql`${customers.balance} - ${Number(existingInvoice.total)}`,
            updatedAt: new Date()
          })
          .where(eq(customers.id, existingInvoice.customerId))

        // Restore stock for each item
        for (const item of existingInvoice.items) {
          if (item.itemId) {
            await tx.update(items)
              .set({
                quantityOnHand: sql`${items.quantityOnHand} + ${Number(item.quantity)}`,
                updatedAt: new Date()
              })
              .where(eq(items.id, item.itemId))
          }
        }
      }
    })

    revalidatePath('/dashboard/invoices')

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
 * Get customers for dropdown (with Peachtree fields for invoice defaults)
 */
export async function getCustomersForDropdown(): Promise<ActionResult<any[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const customerList = await db.query.customers.findMany({
      where: and(eq(customers.companyId, companyId), eq(customers.isActive, true)),
      columns: {
        id: true,
        name: true,
        email: true,
        customerNumber: true,
        // Peachtree fields for invoice defaults
        paymentTerms: true,
        taxExempt: true,
        discountPercent: true,
        priceLevel: true,
        creditLimit: true,
        balance: true,
      },
      orderBy: asc(customers.name),
    })

    return {
      success: true,
      data: customerList,
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

    const itemList = await db.query.items.findMany({
      where: and(eq(items.companyId, companyId), eq(items.isActive, true)),
      columns: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        description: true,
      },
      orderBy: asc(items.name),
    })

    return {
      success: true,
      data: itemList,
    }
  } catch (error) {
    console.error('Error fetching items:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch items',
    }
  }
}
