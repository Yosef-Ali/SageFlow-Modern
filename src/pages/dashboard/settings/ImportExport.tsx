'use client'

import { FileUp, FileDown, Download, Loader2, AlertCircle, CheckCircle, Database } from 'lucide-react'
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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
          Import & Export
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Seamlessly migrate your data from Legacy Peachtree (Sage 50) and manage your cloud-native backups.
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-8 mt-4">
        <div className="flex items-center justify-between border-b pb-1">
          <TabsList className="bg-transparent h-12 p-0 gap-8">
            <TabsTrigger 
              value="import" 
              className="px-0 relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
            >
              Migration (Import)
            </TabsTrigger>
            <TabsTrigger 
              value="export" 
              className="px-0 relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
            >
              Data Extraction (Export)
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid md:grid-cols-3 gap-8">
             {/* Left Column: Import Action */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <FileUp className="h-40 w-40" />
                </div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Peachtree PTB Restore</CardTitle>
                  <CardDescription className="text-base">
                    Upload your .PTB backup file to automatically extract your accounting records.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30 mb-8">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-900 dark:text-blue-400 font-semibold">Ready for Ethiopian Businesses</AlertTitle>
                    <AlertDescription className="text-blue-800/80 dark:text-blue-400/80">
                      Our proprietary engine parses binary DAT files to recover Customers, Vendors, GL Accounts, Inventory, and Employees.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-2xl bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all hover:border-primary/50 group">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <FileUp className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Ready to Upgrade?</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
                      Select your most recent Peachtree Backup file (.ptb) to begin the automated migration process.
                    </p>
                    <PtbImportDialog />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Guide */}
            <div className="space-y-6">
              <Card className="border-none shadow-lg bg-slate-900 text-slate-50">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                    Migration Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-none h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400 border border-emerald-400/20">1</div>
                      <p className="text-slate-300">Open Peachtree (Sage 50) and go to <code className="text-emerald-400 bg-emerald-400/10 px-1 rounded">File &gt; Backup</code>.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-none h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400 border border-emerald-400/20">2</div>
                      <p className="text-slate-300">Save the file as <code className="text-emerald-400 bg-emerald-400/10 px-1 rounded">.ptb</code> (usually found in C:\Peachtree\Company).</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-none h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400 border border-emerald-400/20">3</div>
                      <p className="text-slate-300">Upload that file here. Our system will handle the decryption and formatting.</p>
                    </div>
                  </div>

                  <Separator className="bg-slate-800" />
                  
                  <div className="space-y-2">
                    <p className="font-semibold text-emerald-400">Supported Records:</p>
                    <ul className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" /> Customers</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" /> Vendors</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" /> GL Accounts</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" /> Inventory</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" /> Employees</li>
                      <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-500" /> Journals</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">CSV Exports</CardTitle>
                <CardDescription>Export your unified data for external analysis or statutory reporting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Customer Database', hook: exportCustomers, icon: FileDown, color: 'text-blue-500' },
                  { label: 'Vendor Directory', hook: exportVendors, icon: FileDown, color: 'text-emerald-500' },
                  { label: 'Chart of Accounts', hook: exportChartOfAccounts, icon: FileDown, color: 'text-purple-500' },
                ].map((item) => (
                  <div key={item.label} className="group flex items-center justify-between p-5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.label}</div>
                        <p className="text-xs text-muted-foreground">Full extraction in standard CSV format.</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => item.hook.mutate()} 
                      disabled={item.hook.isPending}
                      className="hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {item.hook.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-950 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Database className="h-48 w-48 text-emerald-400" />
              </div>
              <CardHeader>
                <CardTitle className="text-2xl text-emerald-400">Cloud Sync & Backup</CardTitle>
                <CardDescription className="text-slate-400 text-base">
                  Generate a complete system snapshot compatible with Peachtree restore engines.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 relative">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                   <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <FileDown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">Full .PTB Backup</div>
                      <p className="text-sm text-slate-400">Total system integrity preserved.</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
                    onClick={() => exportPtb.mutate()} 
                    disabled={exportPtb.isPending}
                  >
                    {exportPtb.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing Archive...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Download Backup Archive</>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-emerald-500" /> Encrypted Transfer
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-emerald-500" /> 100% Data Integrity
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
