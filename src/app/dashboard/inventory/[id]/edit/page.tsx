'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ItemForm } from '@/components/inventory/item-form'
import { useItem } from '@/hooks/use-inventory'

interface EditItemPageProps {
  params: { id: string }
}

export default function EditItemPage({ params }: EditItemPageProps) {
  const { id } = params
  const { data: item, isLoading, error } = useItem(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Item not found</p>
          <Link href="/dashboard/inventory">
            <Button variant="outline">Back to Inventory</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/inventory/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Item</h1>
          <p className="text-slate-500">Update {item.name}</p>
        </div>
      </div>

      {/* Form */}
      <ItemForm item={item} />
    </div>
  )
}
