'use server'

import { db } from '@/db'
import { customers, Customer } from '@/db/schema'
import { eq, and, or, ilike, desc, asc, count } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { getCurrentCompanyId, generateCustomerNumber } from '@/lib/customer-utils'
import {
  customerSchema,
  customerFiltersSchema,
  type CustomerFormValues,
  type CustomerFiltersValues,
} from '@/lib/validations/customer'
import { revalidatePath } from 'next/cache'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// Helper type for serialized customer (handling Decimals)
export type SerializedCustomer = Omit<Customer, 'balance' | 'creditLimit'> & {
  balance: number
  creditLimit: number
}

// Helper to serialize customer data (convert Decimals to numbers)
function serializeCustomer(customer: Customer): SerializedCustomer {
  return {
    ...customer,
    balance: Number(customer.balance),
    creditLimit: Number(customer.creditLimit),
  }
}

// Customer list response type
type CustomerListResponse = {
  customers: SerializedCustomer[]
  total: number
}

/**
 * Get list of customers with filters and pagination
 */
export async function getCustomers(
  filters?: Partial<CustomerFiltersValues>
): Promise<ActionResult<CustomerListResponse>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate and parse filters
    const validatedFilters = customerFiltersSchema.parse(filters || {})

    // Build where conditions
    const conditions = [eq(customers.companyId, companyId)]

    if (validatedFilters.status === 'active') {
      conditions.push(eq(customers.isActive, true))
    } else if (validatedFilters.status === 'inactive') {
      conditions.push(eq(customers.isActive, false))
    }

    if (validatedFilters.search) {
      const searchTerm = `%${validatedFilters.search}%`
      conditions.push(
        or(
          ilike(customers.name, searchTerm),
          ilike(customers.email, searchTerm),
          ilike(customers.customerNumber, searchTerm),
          ilike(customers.phone, searchTerm)
        )!
      )
    }

    const whereClause = and(...conditions)

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(customers)
      .where(whereClause)

    // Build orderBy - use a type-safe column map
    const sortableColumns = {
      id: customers.id,
      name: customers.name,
      email: customers.email,
      customerNumber: customers.customerNumber,
      phone: customers.phone,
      balance: customers.balance,
      creditLimit: customers.creditLimit,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    } as const

    const sortField = validatedFilters.sortBy || 'createdAt'
    const sortOrder = validatedFilters.sortOrder || 'desc'
    const orderByColumn = sortableColumns[sortField as keyof typeof sortableColumns] ?? customers.createdAt
    const orderBy = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)

    // Get customers
    const limit = validatedFilters.limit || 20
    const page = validatedFilters.page || 1
    const offset = (page - 1) * limit

    const customerList = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    return {
      success: true,
      data: {
        customers: customerList.map(serializeCustomer),
        total,
      },
    }
  } catch (error) {
    logger.error('Error fetching customers', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customers',
    }
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(id: string): Promise<ActionResult<SerializedCustomer>> {
  try {
    const companyId = await getCurrentCompanyId()

    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),
        eq(customers.companyId, companyId) // Security: Ensure customer belongs to user's company
      ),
    })

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      }
    }

    return {
      success: true,
      data: serializeCustomer(customer),
    }
  } catch (error) {
    logger.error('Error fetching customer', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customer',
    }
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(
  data: CustomerFormValues
): Promise<ActionResult<SerializedCustomer>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate data
    const validatedData = customerSchema.parse(data)

    // Generate customer number
    const customerNumber = await generateCustomerNumber(companyId)

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        companyId,
        customerNumber,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        taxId: validatedData.taxId || null,
        billingAddress: validatedData.billingAddress,
        shippingAddress: validatedData.sameAsBilling
          ? validatedData.billingAddress
          : validatedData.shippingAddress,
        creditLimit: String(validatedData.creditLimit || 0),
        balance: '0', // Initial balance is 0
        notes: validatedData.notes || null,
        isActive: true,
      })
      .returning()

    revalidatePath('/dashboard/customers')

    return {
      success: true,
      data: serializeCustomer(customer),
    }
  } catch (error) {
    logger.error('Error creating customer', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer',
    }
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: string,
  data: CustomerFormValues
): Promise<ActionResult<SerializedCustomer>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate data
    const validatedData = customerSchema.parse(data)

    // Verify ownership
    const existingCustomer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      columns: { companyId: true },
    })

    if (!existingCustomer || existingCustomer.companyId !== companyId) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      }
    }

    // Update customer
    const [customer] = await db
      .update(customers)
      .set({
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        taxId: validatedData.taxId || null,
        billingAddress: validatedData.billingAddress,
        shippingAddress: validatedData.sameAsBilling
          ? validatedData.billingAddress
          : validatedData.shippingAddress,
        creditLimit: String(validatedData.creditLimit || 0),
        notes: validatedData.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning()

    revalidatePath('/dashboard/customers')
    revalidatePath(`/dashboard/customers/${id}`)

    return {
      success: true,
      data: serializeCustomer(customer),
    }
  } catch (error) {
    logger.error('Error updating customer', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer',
    }
  }
}

/**
 * Soft delete a customer (set isActive to false)
 */
export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    // Verify ownership
    const existingCustomer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      columns: { companyId: true },
    })

    if (!existingCustomer || existingCustomer.companyId !== companyId) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      }
    }

    // Soft delete
    await db
      .update(customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customers.id, id))

    revalidatePath('/dashboard/customers')

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Error deleting customer', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete customer',
    }
  }
}

/**
 * Restore a soft-deleted customer (set isActive to true)
 */
export async function restoreCustomer(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    // Verify ownership
    const existingCustomer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      columns: { companyId: true },
    })

    if (!existingCustomer || existingCustomer.companyId !== companyId) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      }
    }

    // Restore
    await db
      .update(customers)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(customers.id, id))

    revalidatePath('/dashboard/customers')

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Error restoring customer', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore customer',
    }
  }
}
