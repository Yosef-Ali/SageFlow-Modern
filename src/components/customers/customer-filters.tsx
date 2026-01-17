'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function CustomerFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'active')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (search) {
        params.set('search', search)
      } else {
        params.delete('search')
      }
      params.set('status', status)
      router.push(`/customers?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, status, router, searchParams])

  const handleClearFilters = () => {
    setSearch('')
    setStatus('active')
    router.push('/customers')
  }

  const hasFilters = search || status !== 'active'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Status Filter */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            size="sm"
            variant={status === 'active' ? 'default' : 'ghost'}
            onClick={() => setStatus('active')}
            className="h-8"
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={status === 'inactive' ? 'default' : 'ghost'}
            onClick={() => setStatus('inactive')}
            className="h-8"
          >
            Inactive
          </Button>
          <Button
            size="sm"
            variant={status === 'all' ? 'default' : 'ghost'}
            onClick={() => setStatus('all')}
            className="h-8"
          >
            All
          </Button>
        </div>

        {hasFilters && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearFilters}
            className="h-9"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
