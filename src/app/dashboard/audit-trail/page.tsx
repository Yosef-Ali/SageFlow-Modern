import { db } from '@/db'
import { auditLogs } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { DashboardHeader } from '@/components/dashboard/header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { getCurrentCompanyId } from '@/lib/customer-utils'

export default async function AuditTrailPage() {
  const companyId = await getCurrentCompanyId()

  const logs = await db.query.auditLogs.findMany({
    where: eq(auditLogs.companyId, companyId),
    orderBy: [desc(auditLogs.timestamp)],
    limit: 100,
  })

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <DashboardHeader
        heading="Audit Trail"
        text="Track system activities and data changes."
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.timestamp), 'PP pp')}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell className="max-w-md truncate" title={log.details || ''}>
                    {log.details || '-'}
                  </TableCell>
                  <TableCell>{log.userId || 'System'}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
