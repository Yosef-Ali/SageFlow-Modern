import { useState } from 'react'
import { FileUp, FileDown, Download, Loader2, AlertCircle, FileSpreadsheet, Database, Shield, Calendar, Building2, Users, BookOpen, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useExportCustomers,
  useExportVendors,
  useExportChartOfAccounts,
  useExportJournalEntries,
} from '@/hooks/use-import-export'
import { PtbImportDialogSimple } from '@/components/peachtree/ptb-import-dialog-simple'
import { CsvImportDialog } from '@/components/peachtree/csv-import-dialog'

export default function ImportExportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Basic exports
  const exportCustomers = useExportCustomers()
  const exportVendors = useExportVendors()
  const exportChartOfAccounts = useExportChartOfAccounts()
  
  // Audit exports
  const exportJournalEntries = useExportJournalEntries()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import & Export</h1>
        <p className="text-muted-foreground mt-1">Manage data migration, backups and audit reports</p>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" />
            Audit / ኦዲት
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* PTB Import */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5 text-emerald-600" />
                  Peachtree Backup (.ptb)
                </CardTitle>
                <CardDescription>
                  Import directly from Sage/Peachtree backup file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Extracts Customers, Vendors, Accounts</p>
                  <p>• Works with unencrypted backups</p>
                  <p>• Automatic data detection</p>
                </div>
                <PtbImportDialogSimple />
              </CardContent>
            </Card>

            {/* CSV Import */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  CSV File Import
                </CardTitle>
                <CardDescription>
                  Import from CSV exports (recommended)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Works with any CSV format</p>
                  <p>• Auto-detects column mapping</p>
                  <p>• Most reliable import method</p>
                </div>
                <CsvImportDialog />
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How to Export from Peachtree</AlertTitle>
            <AlertDescription className="text-xs mt-2 space-y-1">
              <p><strong>For CSV:</strong> In Peachtree, go to File → Export → Select data type → Save as CSV</p>
              <p><strong>For PTB:</strong> In Peachtree, go to File → Backup → Create backup file</p>
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export to CSV</CardTitle>
              <CardDescription>Download your data in CSV format for analysis or backup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="space-y-0.5">
                  <div className="font-medium flex items-center text-sm">
                    <Users className="w-4 h-4 mr-2 text-blue-500" />
                    Customers (ደንበኞች)
                  </div>
                  <p className="text-xs text-muted-foreground">Export all customer profiles</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportCustomers.mutate()} disabled={exportCustomers.isPending}>
                  {exportCustomers.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  CSV
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="space-y-0.5">
                  <div className="font-medium flex items-center text-sm">
                    <Building2 className="w-4 h-4 mr-2 text-purple-500" />
                    Vendors (አቅራቢዎች)
                  </div>
                  <p className="text-xs text-muted-foreground">Export all vendor profiles</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportVendors.mutate()} disabled={exportVendors.isPending}>
                  {exportVendors.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  CSV
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="space-y-0.5">
                  <div className="font-medium flex items-center text-sm">
                    <BookOpen className="w-4 h-4 mr-2 text-emerald-500" />
                    Chart of Accounts
                  </div>
                  <p className="text-xs text-muted-foreground">Export GL account structure</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportChartOfAccounts.mutate()} disabled={exportChartOfAccounts.isPending}>
                  {exportChartOfAccounts.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full System Backup</CardTitle>
              <CardDescription>Generate a complete backup file (.ptb) compatible with Sage 50 / Peachtree.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="space-y-1">
                  <div className="font-medium flex items-center">
                    <Database className="w-4 h-4 mr-2 text-emerald-600" />
                    Full Backup (.ptb)
                  </div>
                  <p className="text-sm text-muted-foreground">All data: Customers, Vendors, Inventory, GL</p>
                </div>
                <Button disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab - Ethiopian Customs & ERCA Compliant */}
        <TabsContent value="audit" className="space-y-4">
          <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
            <Shield className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-800 dark:text-emerald-200">
              Audit Reports / የኦዲት ሪፖርቶች
            </AlertTitle>
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              Ethiopian Customs & ERCA compliant export formats with TIN, VAT, and full transaction history.
              <br />
              <span className="text-xs">ለኢትዮጵያ ጉምሩክና ገቢዎች ባለስልጣን ተኳሃኝ የሆኑ ሪፖርቶች</span>
            </AlertDescription>
          </Alert>

          {/* Date Range Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Report Period / የሪፖርት ጊዜ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date (ከ)</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date (እስከ)</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled
                >
                  <Download className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Core Audit Reports */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Core Audit Reports / ዋና ሪፖርቶች</CardTitle>
                <CardDescription className="text-xs">Essential for ERCA compliance / ለገቢዎች ባለስልጣን አስፈላጊ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-sm">Sage 50 Import / የግቤት ዝርዝር</div>
                    <p className="text-xs text-muted-foreground">General Journal CSV for Peachtree Import</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportJournalEntries.mutate()}
                    disabled={exportJournalEntries.isPending}
                  >
                    {exportJournalEntries.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                    CSV
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-sm">Trial Balance / የሙከራ ሚዛን</div>
                    <p className="text-xs text-muted-foreground">All account balances with debit/credit</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-blue-500" />
                      Bank Transactions / የባንክ ግብይቶች
                    </div>
                    <p className="text-xs text-muted-foreground">All deposits and withdrawals</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tax & Compliance Reports */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tax & Compliance / ግብርና ተገዢነት</CardTitle>
                <CardDescription className="text-xs">ERCA compliant reports / ለገቢዎች ተኳሃኝ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-sm">Invoices with VAT / ደረሰኞች ከተ.እ.ታ</div>
                    <p className="text-xs text-muted-foreground">15% VAT, 2% withholding included</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-sm">Customers with TIN / ደንበኞች ከቲን</div>
                    <p className="text-xs text-muted-foreground">Tax identification numbers included</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium text-sm">Vendors with TIN / አቅራቢዎች ከቲን</div>
                    <p className="text-xs text-muted-foreground">Supplier tax information</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Audit Report Information / የኦዲት ሪፖርት መረጃ</AlertTitle>
            <AlertDescription className="text-xs mt-2 space-y-1">
              <p>• All reports include bilingual headers (English/Amharic)</p>
              <p>• TIN (Tax Identification Number) fields are included where applicable</p>
              <p>• VAT calculations use 15% standard rate / 15% መደበኛ ተ.እ.ታ</p>
              <p>• Withholding tax at 2% for contractors / 2% ለኮንትራተሮች</p>
              <p>• Date format: Ethiopian calendar (EC) with Gregorian (GC) in parentheses</p>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
