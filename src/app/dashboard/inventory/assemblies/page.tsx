import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { getAssemblies } from '@/app/actions/inventory-actions'
import { AssemblyList } from '@/components/inventory/assembly-list'

export default async function AssembliesPage() {
  const result = await getAssemblies()
  const assemblies = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <DashboardHeader 
        heading="Inventory Assemblies" 
        text="Manage Bill of Materials and build items."
      >
        <Link href="/dashboard/inventory/assemblies/new">
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Assembly
            </Button>
        </Link>
      </DashboardHeader>

      <AssemblyList assemblies={assemblies || []} />
    </div>
  )
}
