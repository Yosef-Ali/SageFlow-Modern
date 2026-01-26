import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssemblyList } from '@/components/inventory/assembly-list'
import { useAssemblyDefinitions } from '@/hooks/use-inventory'

export default function AssembliesPage() {
  const { data: assemblies, isLoading } = useAssemblyDefinitions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assemblies</h1>
          <p className="text-muted-foreground mt-1">Manage product assembly definitions (BOM)</p>
        </div>
        <Link to="/dashboard/inventory/assemblies/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Assembly
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <AssemblyList 
          assemblies={assemblies || []} 
        />
      </div>
    </div>
  )
}
