/**
 * Utility functions for consistent error handling
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'An unexpected error occurred'
}

export function isSupabaseError(error: unknown): error is { code: string; message: string; details?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

export function formatSupabaseError(error: unknown): string {
  if (isSupabaseError(error)) {
    // Handle common Supabase/PostgreSQL errors
    switch (error.code) {
      case '23505':
        return 'A record with this value already exists'
      case '23503':
        return 'Cannot delete: record is referenced by other data'
      case '42501':
        return 'Permission denied for this operation'
      case 'PGRST116':
        return 'Record not found'
      default:
        return error.message
    }
  }
  return getErrorMessage(error)
}
