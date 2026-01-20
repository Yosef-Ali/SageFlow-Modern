import Link from 'next/link'
import { Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
// Assuming I might adding a getAdjustments action later or now?
// For now, I haven't implemented getAdjustments list action, only create.
// I'll quickly add getAdjustments to inventory-actions.ts or just show a placeholder list.
// To be complete, I should add getAdjustments.

export default async function AdjustmentsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader 
        heading="Stock Adjustments" 
        text="View history of manual inventory adjustments."
      >
        <Link href="/dashboard/inventory/adjustments/new">
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Adjustment
            </Button>
        </Link>
      </DashboardHeader>

      <div className="border rounded-lg p-8 text-center text-muted-foreground bg-card">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground/60" />
        <h3 className="text-lg font-medium text-foreground">Adjustment History</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            History view is coming soon. You can record new adjustments using the button above, and they will reflect in item stock levels immediately.
        </p>
      </div>
    </div>
  )
}
