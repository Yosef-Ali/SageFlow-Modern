import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ItemForm } from '@/components/inventory/item-form'

export default function NewItemPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Item</h1>
          <p className="text-muted-foreground mt-1">Add a new item to inventory</p>
        </div>
      </div>

      <ItemForm />
    </div>
  )
}
