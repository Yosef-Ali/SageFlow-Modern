import { Link } from 'react-router-dom'
import { Plus, Search, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardHeader } from '@/components/dashboard/header'

export default function JournalsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Journal Entries"
        text="Record and manage journal entries"
      >
        <Link to="/dashboard/journals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </Link>
      </DashboardHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search journal entries..." className="pl-10" />
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">No journal entries</p>
        <p className="text-slate-400 text-sm mt-1">Create your first journal entry</p>
        <Link to="/dashboard/journals/new">
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </Link>
      </div>
    </div>
  )
}
