import { Customer as PrismaCustomer } from '@prisma/client'

// Address structure for billing and shipping addresses
export interface Address {
  street?: string
  city?: string
  region?: string
  country?: string
  postalCode?: string
}

// Full customer type from Prisma
export type Customer = PrismaCustomer

// Customer form data (used for create/update operations)
export interface CustomerFormData {
  name: string
  email?: string
  phone: string
  taxId?: string
  billingAddress: Address
  shippingAddress?: Address
  sameAsbilling?: boolean
  creditLimit?: number
  notes?: string
}

// Customer list item with computed fields
export interface CustomerListItem extends Omit<Customer, 'billingAddress' | 'shippingAddress'> {
  billingAddress: Address | null
  shippingAddress: Address | null
}

// Customer filters
export interface CustomerFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  sortBy?: 'name' | 'customerNumber' | 'balance' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}
