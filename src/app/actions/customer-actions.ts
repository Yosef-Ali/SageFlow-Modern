'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentCompanyId, generateCustomerNumber } from '@/lib/customer-utils'
import {
  customerSchema,
  customerFiltersSchema,
  type CustomerFormValues,
  type CustomerFiltersValues,
} from '@/lib/validations/customer'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// Action result type
type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get list of customers with filters and pagination
 */
export async function getCustomers(
  filters?: Partial<CustomerFiltersValues>
): Promise<ActionResult<{ customers: any[]; total: number }>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate and parse filters
    const validatedFilters = customerFiltersSchema.parse(filters || {})

    // Build where clause
    const where: Prisma.CustomerWhereInput = {
      companyId,
      ...(validatedFilters.status === 'active' && { isActive: true }),
      ...(validatedFilters.status === 'inactive' && { isActive: false }),
      ...(validatedFilters.search && {
        OR: [
          { name: { contains: validatedFilters.search, mode: 'insensitive' } },
          { email: { contains: validatedFilters.search, mode: 'insensitive' } },
          { customerNumber: { contains: validatedFilters.search, mode: 'insensitive' } },
          { phone: { contains: validatedFilters.search, mode: 'insensitive' } },
        ],
      }),
    }

    // Build orderBy
    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [validatedFilters.sortBy || 'createdAt']: validatedFilters.sortOrder || 'desc',
    }

    // Get total count
    const total = await prisma.customer.count({ where })

    // Get customers
    const customers = await prisma.customer.findMany({
      where,
      orderBy,
      skip: ((validatedFilters.page || 1) - 1) * (validatedFilters.limit || 20),
      take: validatedFilters.limit || 20,
    })

    return {
      success: true,
      data: {
        customers,
        total,
      },
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
 * Get a single customer by ID
 */
export async function getCustomer(id: string): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    const customer = await prisma.customer.findUnique({
      where: {
        id,
        companyId, // Security: Ensure customer belongs to user's company
      },
    })

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      }
    }

    return {
      success: true,
      data: customer,
    }
  } catch (error) {
    console.error('Error fetching customer:', error)
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
): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate data
    const validatedData = customerSchema.parse(data)

    // Generate customer number
    const customerNumber = await generateCustomerNumber(companyId)

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        companyId,
        customerNumber,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        taxId: validatedData.taxId || null,
        billingAddress: validatedData.billingAddress as Prisma.InputJsonValue,
        shippingAddress: (validatedData.sameAsBilling
          ? validatedData.billingAddress
          : validatedData.shippingAddress) as Prisma.InputJsonValue,
        creditLimit: validatedData.creditLimit || 0,
        balance: 0, // Initial balance is 0
        notes: validatedData.notes || null,
        isActive: true,
      },
    })

    revalidatePath('/customers')

    return {
      success: true,
      data: customer,
    }
  } catch (error) {
    console.error('Error creating customer:', error)
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
): Promise<ActionResult<any>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate data
    const validatedData = customerSchema.parse(data)

    // Verify ownership
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!existingCustomer || existingCustomer.companyId !== companyId) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      }
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        taxId: validatedData.taxId || null,
        billingAddress: validatedData.billingAddress as Prisma.InputJsonValue,
        shippingAddress: (validatedData.sameAsBilling
          ? validatedData.billingAddress
          : validatedData.shippingAddress) as Prisma.InputJsonValue,
        creditLimit: validatedData.creditLimit || 0,
        notes: validatedData.notes || null,
      },
    })

    revalidatePath('/customers')
    revalidatePath(`/customers/${id}`)

    return {
      success: true,
      data: customer,
    }
  } catch (error) {
    console.error('Error updating customer:', error)
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
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!existingCustomer || existingCustomer.companyId !== companyId) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      }
    }

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    })

    revalidatePath('/customers')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting customer:', error)
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
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!existingCustomer || existingCustomer.companyId !== companyId) {
      return {
        success: false,
        error: 'Customer not found or access denied',
      }
    }

    // Restore
    await prisma.customer.update({
      where: { id },
      data: { isActive: true },
    })

    revalidatePath('/customers')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error restoring customer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore customer',
    }
  }
}
