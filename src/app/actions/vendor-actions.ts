'use server'

import { db } from '@/db'
import { vendors } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schema
const vendorSchema = z.object({
  vendorNumber: z.string().optional(),
  name: z.string().min(1, 'Vendor name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type VendorFormValues = z.infer<typeof vendorSchema>

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get all vendors
 */
export async function getVendors(options?: {
  search?: string
  active?: boolean
}): Promise<ActionResult<typeof vendors.$inferSelect[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    const vendorList = await db.query.vendors.findMany({
      where: eq(vendors.companyId, companyId),
      orderBy: [asc(vendors.name)],
    })

    let filtered = vendorList
    if (options?.search) {
      const search = options.search.toLowerCase()
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(search) ||
        v.vendorNumber?.toLowerCase().includes(search) ||
        v.email?.toLowerCase().includes(search)
      )
    }
    if (options?.active !== undefined) {
      filtered = filtered.filter(v => v.isActive === options.active)
    }

    return { success: true, data: filtered }
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vendors',
    }
  }
}

/**
 * Get single vendor
 */
export async function getVendor(id: string): Promise<ActionResult<typeof vendors.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()

    const vendor = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.id, id),
        eq(vendors.companyId, companyId)
      ),
    })

    if (!vendor) {
      return { success: false, error: 'Vendor not found' }
    }

    return { success: true, data: vendor }
  } catch (error) {
    console.error('Error fetching vendor:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vendor',
    }
  }
}

/**
 * Create vendor
 */
export async function createVendor(data: VendorFormValues): Promise<ActionResult<typeof vendors.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validated = vendorSchema.parse(data)

    // Generate vendor number if not provided
    let vendorNumber = validated.vendorNumber
    if (!vendorNumber) {
      const count = await db.query.vendors.findMany({
        where: eq(vendors.companyId, companyId),
      })
      vendorNumber = `VEND-${String(count.length + 1).padStart(4, '0')}`
    }

    const [vendor] = await db.insert(vendors).values({
      companyId,
      vendorNumber,
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      address: validated.address || null,
      taxId: validated.taxId || null,
      paymentTerms: validated.paymentTerms || null,
      notes: validated.notes || null,
      isActive: validated.isActive,
      balance: '0',
    }).returning()

    revalidatePath('/dashboard/vendors')

    return { success: true, data: vendor }
  } catch (error) {
    console.error('Error creating vendor:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create vendor',
    }
  }
}

/**
 * Update vendor
 */
export async function updateVendor(id: string, data: VendorFormValues): Promise<ActionResult<typeof vendors.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()
    const validated = vendorSchema.parse(data)

    const existing = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.id, id),
        eq(vendors.companyId, companyId)
      ),
    })

    if (!existing) {
      return { success: false, error: 'Vendor not found' }
    }

    const [updated] = await db.update(vendors)
      .set({
        vendorNumber: validated.vendorNumber || existing.vendorNumber,
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        taxId: validated.taxId || null,
        paymentTerms: validated.paymentTerms || null,
        notes: validated.notes || null,
        isActive: validated.isActive,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning()

    revalidatePath('/dashboard/vendors')
    revalidatePath(`/dashboard/vendors/${id}`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating vendor:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vendor',
    }
  }
}

/**
 * Delete vendor
 */
export async function deleteVendor(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const existing = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.id, id),
        eq(vendors.companyId, companyId)
      ),
    })

    if (!existing) {
      return { success: false, error: 'Vendor not found' }
    }

    await db.delete(vendors).where(eq(vendors.id, id))

    revalidatePath('/dashboard/vendors')

    return { success: true }
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete vendor',
    }
  }
}

/**
 * Get vendors summary
 */
export async function getVendorsSummary(): Promise<ActionResult<{
  total: number
  active: number
  totalBalance: number
}>> {
  try {
    const companyId = await getCurrentCompanyId()

    const vendorList = await db.query.vendors.findMany({
      where: eq(vendors.companyId, companyId),
    })

    const summary = {
      total: vendorList.length,
      active: vendorList.filter(v => v.isActive).length,
      totalBalance: vendorList.reduce((sum, v) => sum + parseFloat(v.balance || '0'), 0),
    }

    return { success: true, data: summary }
  } catch (error) {
    console.error('Error getting vendors summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
    }
  }
}
