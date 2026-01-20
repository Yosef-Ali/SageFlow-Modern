'use client'

import { useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Download, Upload, AlertTriangle, FileArchive, Loader2, CheckCircle2 } from 'lucide-react'
import { generatePtbBackup } from '@/app/actions/backup-actions'
import { importPtbAction } from '@/app/actions/peachtree-import-export'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ImportExportPage() {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [fiscalYear, setFiscalYear] = useState('all')
  const [importFile, setImportFile] = useState<File | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await generatePtbBackup(fiscalYear)
      if (result.success && result.data) {
        // Convert base64 to blob and download
        const binaryString = window.atob(result.data)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'application/zip' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `SageFlow_Backup_${new Date().toISOString().split('T')[0]}.ptb`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({ title: 'Success', description: 'Backup downloaded successfully.' })
      } else {
        toast({ title: 'Error', description: result.error || 'Export failed', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) return

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const result = await importPtbAction(formData)
      
      if (result.success && result.data) {
        const { customers, vendors, accounts, items, employees, journals } = result.data
        toast({ 
          title: 'Import Successful', 
          description: (
            <div className="mt-2 text-xs space-y-1">
              <p>Customers: <b>{customers}</b></p>
              <p>Vendors: <b>{vendors}</b></p>
              <p>Accounts: <b>{accounts}</b></p>
              <p>Items: <b>{items}</b></p>
              <p>Employees: <b>{employees}</b></p>
              <p>Journals: <b>{journals}</b></p>
              <p>Audit Logs: <b>{result.data.auditLogs}</b></p>
            </div>
          ),
          duration: 5000
        })
        setImportFile(null)
        // Reset file input value
        const fileInput = document.getElementById('backup-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        toast({ 
          title: 'Import Failed', 
          description: result.error || 'The import process could not complete.', 
          variant: 'destructive' 
        })
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'An unexpected system error occurred.', 
        variant: 'destructive' 
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <DashboardHeader
        heading="Import & Export"
        text="Manage your data backups and standard Peachtree (PTB) transfers."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* EXPORT SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              Full Backup Export (.PTB)
            </CardTitle>
            <CardDescription>
              Generates a Peachtree-compatible ZIP archive containing your Charts of Assets, Customers, Vendors, Employees, and Journal Entries in standard CSV format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Compatibility Note</AlertTitle>
              <AlertDescription>
                The generated file is a standard ZIP archive renamed to .PTB. Use the "Restore" function in legacy systems or "Import" from CSV.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>Select Fiscal Year (Ethiopian Calendar)</Label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Fiscal Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="2017">2017 EC (Current)</SelectItem>
                  <SelectItem value="2016">2016 EC (Last Year)</SelectItem>
                  <SelectItem value="2015">2015 EC</SelectItem>
                  <SelectItem value="2014">2014 EC</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Filters journal entries by the selected fiscal year range (approx. Sep 11 - Sep 10).
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleExport} 
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Backup...
                </>
              ) : (
                <>
                  <FileArchive className="mr-2 h-4 w-4" />
                  Download Full Backup (.ptb)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* IMPORT SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-600" />
              Import Data
            </CardTitle>
            <CardDescription>
               Upload a standard Peachtree Backup (.ptb) or ZIP file to restore data.
               Currently supports: Accounts, Inventory, Employees, and Journals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="backup-file">Backup File</Label>
              <Input 
                id="backup-file" 
                type="file" 
                accept=".ptb,.zip" 
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            
            <Alert className="bg-muted/50 border-dashed">
               <CheckCircle2 className="h-4 w-4 text-emerald-600" />
               <AlertTitle className="text-xs font-medium">Ready for Import</AlertTitle>
               <AlertDescription className="text-xs text-muted-foreground mt-1">
                 File size limit: 50MB. Ensure the file is not corrupted.
                 The import process may take a few minutes for larger files.
               </AlertDescription>
            </Alert>

            <Button 
              variant="default" 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              disabled={!importFile || isImporting}
              onClick={handleImport}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Data...
                </>
              ) : (
                'Start Import'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
