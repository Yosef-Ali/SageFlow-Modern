import { useState } from 'react'
import { History, Search, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuditLogs } from '@/hooks/use-audit-logs'

export default function AuditTrailPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: logs, isLoading } = useAuditLogs()

  // Basic client-side search logic
  const filteredLogs = logs?.filter(log => 
    (log.user_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.entity_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'UPDATE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'DELETE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground mt-1">Track system activity and user actions</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search activity..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by Action" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
             <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
            <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-40">Timestamp</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-32">User</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-24">Action</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-32">Entity</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Details</th>
                </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 align-middle font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold">
                                {(log.user_id || 'U').substring(0,2).toUpperCase()}
                            </div>
                            {log.user_id || 'System'}
                        </div>
                    </td>
                    <td className="p-4 align-middle">
                        <Badge variant="outline" className={`border-0 ${getActionColor(log.action)}`}>
                            {log.action}
                        </Badge>
                    </td>
                    <td className="p-4 align-middle">
                        {log.entity_type} <span className="text-xs text-muted-foreground ml-1">{log.entity_id}</span>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                        {log.details}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </div>
  )
}
