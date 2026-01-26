import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssemblyForm } from '@/components/inventory/assembly-form'
import { useItems } from '@/hooks/use-inventory'

export default function NewAssemblyPage() {
  const navigate = useNavigate()
  const { data: items, isLoading } = useItems()

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Assembly</h1>
          <p className="text-muted-foreground mt-1">Define a new assembly / bill of materials</p>
        </div>
      </div>

      {/* 
        AssemblyForm expects 'items' as the list of available components/products.
      */}
      <AssemblyForm items={items || []} />
    </div>
  )
}
