'use client'

import { FileUp, FileDown, Download, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useExportCustomers,
  useExportVendors,
  useExportChartOfAccounts,
  useExportToPtb,
} from '@/hooks/use-import-export'
import { PtbImportDialog } from '@/components/peachtree/ptb-import-dialog'

export default function ImportExportPage() {
  const exportCustomers = useExportCustomers()
  const exportVendors = useExportVendors()
  const exportChartOfAccounts = useExportChartOfAccounts()
  const exportPtb = useExportToPtb()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import & Export</h1>
        <p className="text-muted-foreground mt-1">Manage data migration and backups</p>
      </div>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Download your data in CSV format for analysis or reporting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="font-medium flex items-center">
                    <FileDown className="w-4 h-4 mr-2 text-blue-500" />
                    Customers List
                  </div>
                  <p className="text-sm text-muted-foreground">Export all active customer profiles to CSV.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => exportCustomers.mutate()} 
                  disabled={exportCustomers.isPending}
                >
                  {exportCustomers.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export CSV
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="font-medium flex items-center">
                    <FileDown className="w-4 h-4 mr-2 text-blue-500" />
                    Vendors List
                  </div>
                  <p className="text-sm text-muted-foreground">Export all vendor profiles to CSV.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => exportVendors.mutate()} 
                  disabled={exportVendors.isPending}
                >
                  {exportVendors.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export CSV
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="font-medium flex items-center">
                    <FileDown className="w-4 h-4 mr-2 text-blue-500" />
                    Chart of Accounts
                  </div>
                  <p className="text-sm text-muted-foreground">Export General Ledger account structure.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => exportChartOfAccounts.mutate()} 
                  disabled={exportChartOfAccounts.isPending}
                >
                  {exportChartOfAccounts.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Backup (Peachtree Compatible)</CardTitle>
              <CardDescription>Generate a full backup file (.ptb) compatible with Sage 50 / Peachtree.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="space-y-1">
                  <div className="font-medium flex items-center">
                    <FileDown className="w-4 h-4 mr-2 text-emerald-600" />
                    Full Backup (.ptb)
                  </div>
                  <p className="text-sm text-muted-foreground">Includes Customers, Vendors, Inventory, and GL data.</p>
                </div>
                <Button 
                  onClick={() => exportPtb.mutate()} 
                  disabled={exportPtb.isPending}
                >
                  {exportPtb.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Data from Peachtree</CardTitle>
              <CardDescription>Restore data from a Sage/Peachtree backup file (.ptb).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Information</AlertTitle>
                <AlertDescription>
                  This will extract Customers, Vendors, and Chart of Accounts from your .ptb backup file. Existing records will be preserved, and new ones will be added.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30">
                <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Ready to Import?</h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
                  Select your Peachtree Backup file (.ptb) to begin the automated extraction process.
                </p>
                <PtbImportDialog />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
