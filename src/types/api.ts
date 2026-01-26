/**
 * Shared API response types for consistent error handling across services
 */

export interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ListResult<T> {
  items: T[]
  total: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface SummaryStats {
  total: number
  active: number
  totalBalance?: number
}
