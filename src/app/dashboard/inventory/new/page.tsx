import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItemForm } from '@/components/inventory/item-form'

export default function NewItemPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Item</h1>
          <p className="text-muted-foreground">Create a new inventory item</p>
        </div>
      </div>

      {/* Form */}
      <ItemForm />
    </div>
  )
}
