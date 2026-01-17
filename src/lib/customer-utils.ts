import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Get the current company ID from the authenticated user's session
 * CRITICAL FOR MULTI-TENANCY: This ensures users can only access their company's data
 *
 * @throws Error if user is not authenticated or has no company
 * @returns The company ID of the authenticated user
 */
export async function getCurrentCompanyId(): Promise<string> {
  const session = await getSession()

  if (!session?.user?.companyId) {
    // For development/testing, fall back to first company
    // This should be removed in production
    const defaultCompany = await prisma.company.findFirst({
      select: { id: true },
    })

    if (!defaultCompany) {
      throw new Error('No company found. Please create a company first.')
    }

    console.warn('Warning: Using fallback company ID. Implement proper authentication.')
    return defaultCompany.id
  }

  return session.user.companyId
}

/**
 * Generate the next customer number for a company
 * Format: CUST-001, CUST-002, etc.
 *
 * @param companyId - The company ID to generate the customer number for
 * @returns The next available customer number in format CUST-XXX
 */
export async function generateCustomerNumber(companyId: string): Promise<string> {
  const lastCustomer = await prisma.customer.findFirst({
    where: { companyId },
    orderBy: { customerNumber: 'desc' },
    select: { customerNumber: true },
  })

  if (!lastCustomer) {
    return 'CUST-001'
  }

  // Extract the numeric part and increment
  const lastNumber = parseInt(lastCustomer.customerNumber.split('-')[1] || '0', 10)
  const nextNumber = lastNumber + 1

  // Pad with zeros to ensure 3 digits
  return `CUST-${String(nextNumber).padStart(3, '0')}`
}

/**
 * Format customer balance for display
 * Positive balances mean the customer owes money
 *
 * @param balance - The balance amount
 * @returns Formatted balance string with appropriate styling indicator
 */
export function formatCustomerBalance(balance: number): {
  formatted: string
  isOwed: boolean
} {
  const isOwed = balance > 0

  return {
    formatted: new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(Math.abs(balance)),
    isOwed,
  }
}
