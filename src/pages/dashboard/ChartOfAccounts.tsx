import { Link } from 'react-router-dom'
import { Plus, Search, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardHeader } from '@/components/dashboard/header'

export default function ChartOfAccountsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Chart of Accounts"
        text="Manage your account structure and categories"
      >
        <Link to="/dashboard/chart-of-accounts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </Link>
      </DashboardHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search accounts..." className="pl-10" />
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Layers className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">No accounts found</p>
        <p className="text-slate-400 text-sm mt-1">Set up your chart of accounts to get started</p>
        <Link to="/dashboard/chart-of-accounts/new">
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </Link>
      </div>
    </div>
  )
}
