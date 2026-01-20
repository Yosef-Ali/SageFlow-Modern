'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Customers page error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-red-100 p-6 mb-4">
        <AlertCircle className="h-12 w-12 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6 max-w-sm">
        {error.message || 'An error occurred while loading customers. Please try again.'}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  )
}
