import type { Customer as DrizzleCustomer } from '@/db/schema'

// Address structure for billing and shipping addresses
export interface Address {
  street?: string
  city?: string
  region?: string
  country?: string
  postalCode?: string
}

// Full customer type from Drizzle
export type Customer = DrizzleCustomer

// Serialized customer type (with Decimals converted to numbers for client-side use)
export type SerializedCustomer = Omit<Customer, 'balance' | 'creditLimit' | 'discountPercent' | 'openingBalance'> & {
  balance: number
  creditLimit: number
  discountPercent: number
  openingBalance: number
}

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
