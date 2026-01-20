'use server'

import { db } from '@/db'
import { employees } from '@/db/schema'
import { eq, and, desc, asc, like, or } from 'drizzle-orm'
import { getCurrentCompanyId } from '@/lib/customer-utils'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schema
const employeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  ssn: z.string().optional(),
  payMethod: z.string().optional(),
  payFrequency: z.string().optional(),
  address: z.any().optional(),
  hireDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  // Peachtree payroll fields
  employeeType: z.string().default('REGULAR'),
  payRate: z.number().min(0).optional(),
  overtimeRate: z.number().min(1).default(1.5),
  bankAccountNo: z.string().optional(),
  bankName: z.string().optional(),
  taxId: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  terminationDate: z.string().optional().nullable(),
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>

type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get all employees
 */
export async function getEmployees(options?: {
  search?: string
}): Promise<ActionResult<typeof employees.$inferSelect[]>> {
  try {
    const companyId = await getCurrentCompanyId()

    let query = db.select().from(employees)
      .where(eq(employees.companyId, companyId))
      .orderBy(asc(employees.lastName), asc(employees.firstName))

    const result = await query

    // Apply filters in memory for simplicity
    let filtered = result
    if (options?.search) {
      const search = options.search.toLowerCase()
      filtered = filtered.filter(e =>
        e.firstName.toLowerCase().includes(search) ||
        e.lastName.toLowerCase().includes(search) ||
        e.employeeCode.toLowerCase().includes(search)
      )
    }

    return { success: true, data: filtered }
  } catch (error) {
    console.error('Error fetching employees:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch employees',
    }
  }
}

/**
 * Get single employee by ID
 */
export async function getEmployee(id: string): Promise<ActionResult<typeof employees.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()

    const [employee] = await db.select().from(employees)
      .where(and(
        eq(employees.id, id),
        eq(employees.companyId, companyId)
      ))
      .limit(1)

    if (!employee) {
      return { success: false, error: 'Employee not found' }
    }

    return { success: true, data: employee }
  } catch (error) {
    console.error('Error fetching employee:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch employee',
    }
  }
}

/**
 * Create new employee
 */
export async function createEmployee(data: EmployeeFormValues): Promise<ActionResult<typeof employees.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()

    // Validate
    const validated = employeeSchema.parse(data)

    // Check for duplicate employee code
    const [existing] = await db.select().from(employees)
      .where(and(
        eq(employees.companyId, companyId),
        eq(employees.employeeCode, validated.employeeCode)
      ))
      .limit(1)

    if (existing) {
      return { success: false, error: 'Employee code already exists' }
    }

    const [employee] = await db.insert(employees).values({
      companyId,
      employeeCode: validated.employeeCode,
      firstName: validated.firstName,
      lastName: validated.lastName,
      jobTitle: validated.jobTitle || null,
      department: validated.department || null,
      email: validated.email || null,
      phone: validated.phone || null,
      ssn: validated.ssn || null,
      payMethod: validated.payMethod || null,
      payFrequency: validated.payFrequency || null,
      address: validated.address || null,
      hireDate: validated.hireDate ? new Date(validated.hireDate) : null,
      isActive: validated.isActive,
      // Peachtree fields
      employeeType: validated.employeeType || 'REGULAR',
      payRate: validated.payRate?.toString() || null,
      overtimeRate: validated.overtimeRate?.toString() || '1.5',
      bankAccountNo: validated.bankAccountNo || null,
      bankName: validated.bankName || null,
      taxId: validated.taxId || null,
      emergencyContactName: validated.emergencyContactName || null,
      emergencyContactPhone: validated.emergencyContactPhone || null,
      terminationDate: validated.terminationDate ? new Date(validated.terminationDate) : null,
    }).returning()

    revalidatePath('/dashboard/employees')

    return { success: true, data: employee }
  } catch (error) {
    console.error('Error creating employee:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create employee',
    }
  }
}

/**
 * Update employee
 */
export async function updateEmployee(id: string, data: EmployeeFormValues): Promise<ActionResult<typeof employees.$inferSelect>> {
  try {
    const companyId = await getCurrentCompanyId()

    const validated = employeeSchema.parse(data)

    // Check exists
    const [existing] = await db.select().from(employees)
      .where(and(
        eq(employees.id, id),
        eq(employees.companyId, companyId)
      ))
      .limit(1)

    if (!existing) {
      return { success: false, error: 'Employee not found' }
    }

    const [updated] = await db.update(employees)
      .set({
        employeeCode: validated.employeeCode,
        firstName: validated.firstName,
        lastName: validated.lastName,
        jobTitle: validated.jobTitle || null,
        department: validated.department || null,
        email: validated.email || null,
        phone: validated.phone || null,
        ssn: validated.ssn || null,
        payMethod: validated.payMethod || null,
        payFrequency: validated.payFrequency || null,
        address: validated.address || null,
        hireDate: validated.hireDate ? new Date(validated.hireDate) : null,
        isActive: validated.isActive,
        // Peachtree fields
        employeeType: validated.employeeType || 'REGULAR',
        payRate: validated.payRate?.toString() || null,
        overtimeRate: validated.overtimeRate?.toString() || '1.5',
        bankAccountNo: validated.bankAccountNo || null,
        bankName: validated.bankName || null,
        taxId: validated.taxId || null,
        emergencyContactName: validated.emergencyContactName || null,
        emergencyContactPhone: validated.emergencyContactPhone || null,
        terminationDate: validated.terminationDate ? new Date(validated.terminationDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning()

    revalidatePath('/dashboard/employees')
    revalidatePath(`/dashboard/employees/${id}`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating employee:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update employee',
    }
  }
}

/**
 * Delete employee
 */
export async function deleteEmployee(id: string): Promise<ActionResult> {
  try {
    const companyId = await getCurrentCompanyId()

    const [existing] = await db.select().from(employees)
      .where(and(
        eq(employees.id, id),
        eq(employees.companyId, companyId)
      ))
      .limit(1)

    if (!existing) {
      return { success: false, error: 'Employee not found' }
    }

    await db.delete(employees).where(eq(employees.id, id))

    revalidatePath('/dashboard/employees')

    return { success: true }
  } catch (error) {
    console.error('Error deleting employee:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete employee',
    }
  }
}
