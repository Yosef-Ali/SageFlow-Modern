import { db } from '@/db'
import { journalEntries, journalLines, chartOfAccounts } from '@/db/schema'
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
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { getCurrentCompanyId } from '@/lib/customer-utils'

export default async function JournalsPage() {
  const companyId = await getCurrentCompanyId()

  const journals = await db.query.journalEntries.findMany({
    where: eq(journalEntries.companyId, companyId),
    orderBy: [desc(journalEntries.date)],
    limit: 100,
    with: {
      lines: {
        with: {
            account: true
        }
      }
    }
  })

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <DashboardHeader
        heading="Journal Entries"
        text="View your general ledger journal entries."
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Debit</TableHead>
                <TableHead className="text-right">Total Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journals.map((entry) => {
                 // Calculate totals for quick view
                 const totalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0)
                 const totalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0)

                 return (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), 'PPP')}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.reference || '-'}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{totalCredit.toFixed(2)}</TableCell>
                  </TableRow>
                )
              })}
              {journals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No journal entries found. Import data or create a manual entry.
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
