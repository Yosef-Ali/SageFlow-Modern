'use client'

import { useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Download, Upload, AlertTriangle, FileArchive, Loader2 } from 'lucide-react'
import { generatePtbBackup } from '@/app/actions/backup-actions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function ImportExportPage() {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await generatePtbBackup()
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

        {/* IMPORT SECTION - Placeholder for now as the script exists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-600" />
              Import Data
            </CardTitle>
            <CardDescription>
               Upload a standard Peachtree Backup (.ptb) or ZIP file to restore data.
               Currently supports: Accounts, Inventory, Employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="backup-file">Backup File</Label>
              <Input id="backup-file" type="file" accept=".ptb,.zip" disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              * Web-based import is currently under maintenance. Please use the server-side script for large migrations.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Start Import (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
