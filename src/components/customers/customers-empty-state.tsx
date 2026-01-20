import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CustomersEmptyStateProps {
  onAddCustomer: () => void
}

export function CustomersEmptyState({ onAddCustomer }: CustomersEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-slate-100 p-6 mb-4">
        <Users className="h-12 w-12 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No customers yet
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6 max-w-sm">
        Get started by adding your first customer. You can manage customer information,
        track balances, and create invoices.
      </p>
      <Button onClick={onAddCustomer}>
        Add Your First Customer
      </Button>
    </div>
  )
}
