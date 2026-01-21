'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Database,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings,
  History,
  Users,
  Package,
  FileText,
  Building2,
  CreditCard,
  BarChart3,
  Plug,
  Eye,
} from 'lucide-react'

type SyncableEntity = 'customers' | 'vendors' | 'items' | 'invoices' | 'payments' | 'chartOfAccounts'

interface SyncConfig {
  dsn: string
  username: string
  password: string
  connectionStatus: 'CONNECTED' | 'FAILED' | 'UNTESTED' | null
  lastConnectionTest: string | null
}

interface SyncSummary {
  entity: string
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
}

interface SyncResult {
  jobId: string
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED'
  summary: SyncSummary[]
  errors: Array<{ entity: string; id: string; error: string }>
  duration: number
}

const ENTITY_CONFIG: Record<SyncableEntity, { label: string; icon: React.ReactNode; description: string }> = {
  customers: {
    label: 'Customers',
    icon: <Users className="h-4 w-4" />,
    description: 'Customer records and balances',
  },
  vendors: {
    label: 'Vendors',
    icon: <Building2 className="h-4 w-4" />,
    description: 'Vendor/supplier records',
  },
  items: {
    label: 'Inventory Items',
    icon: <Package className="h-4 w-4" />,
    description: 'Products, services, and stock levels',
  },
  chartOfAccounts: {
    label: 'Chart of Accounts',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'GL accounts and balances',
  },
  invoices: {
    label: 'Invoices',
    icon: <FileText className="h-4 w-4" />,
    description: 'Sales invoices and line items',
  },
  payments: {
    label: 'Payments',
    icon: <CreditCard className="h-4 w-4" />,
    description: 'Customer payments received',
  },
}

export default function PeachtreeSyncPage() {
  const { toast } = useToast()

  // Connection state
  const [config, setConfig] = useState<SyncConfig>({
    dsn: '',
    username: '',
    password: '',
    connectionStatus: null,
    lastConnectionTest: null,
  })
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  // Sync state
  const [selectedEntities, setSelectedEntities] = useState<SyncableEntity[]>([
    'customers', 'vendors', 'items', 'chartOfAccounts', 'invoices', 'payments'
  ])
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [dryRun, setDryRun] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  // Mapping stats
  const [mappingStats, setMappingStats] = useState<Record<string, number>>({})

  // TODO: Get actual company ID from auth context
  const companyId = 'demo-company'

  // Load config on mount
  useEffect(() => {
    loadConfig()
    loadMappingStats()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch(`/api/sync/config?companyId=${companyId}`)
      const data = await res.json()
      if (data.config) {
        setConfig({
          dsn: data.config.dsn || '',
          username: data.config.username || '',
          password: data.config.password || '',
          connectionStatus: data.config.connectionStatus,
          lastConnectionTest: data.config.lastConnectionTest,
        })
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const loadMappingStats = async () => {
    try {
      const res = await fetch(`/api/sync?companyId=${companyId}`)
      const data = await res.json()
      if (data.stats) {
        setMappingStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleSaveConfig = async () => {
    setIsSavingConfig(true)
    try {
      const res = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          dsn: config.dsn,
          username: config.username,
          password: config.password,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Configuration Saved', description: 'ODBC settings have been saved.' })
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' })
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    try {
      // Save config first
      await handleSaveConfig()

      const res = await fetch('/api/sync/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await res.json()

      setConfig(prev => ({
        ...prev,
        connectionStatus: data.success ? 'CONNECTED' : 'FAILED',
        lastConnectionTest: new Date().toISOString(),
      }))

      if (data.success) {
        toast({ title: 'Connection Successful', description: 'Connected to Peachtree database.' })
      } else {
        toast({ title: 'Connection Failed', description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Connection test failed', variant: 'destructive' })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleEntityToggle = (entity: SyncableEntity) => {
    setSelectedEntities(prev =>
      prev.includes(entity)
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    )
  }

  const handleSelectAll = () => {
    setSelectedEntities(['customers', 'vendors', 'items', 'chartOfAccounts', 'invoices', 'payments'])
  }

  const handleSelectNone = () => {
    setSelectedEntities([])
  }

  const handleStartSync = async () => {
    if (selectedEntities.length === 0) {
      toast({ title: 'No Entities Selected', description: 'Please select at least one entity to sync.', variant: 'destructive' })
      return
    }

    setIsSyncing(true)
    setSyncProgress(0)
    setSyncResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 5, 90))
      }, 500)

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          entities: selectedEntities,
          dateRangeStart: dateRangeStart || undefined,
          dateRangeEnd: dateRangeEnd || undefined,
          forceUpdate,
          dryRun,
        }),
      })

      clearInterval(progressInterval)
      setSyncProgress(100)

      const data = await res.json()

      if (data.success) {
        setSyncResult(data.result)
        loadMappingStats()

        const status = data.result.status
        if (status === 'COMPLETED') {
          toast({ title: 'Sync Completed', description: `Successfully synced ${selectedEntities.length} entities.` })
        } else if (status === 'PARTIAL') {
          toast({ title: 'Sync Completed with Warnings', description: 'Some records failed to sync.', variant: 'destructive' })
        }
      } else {
        toast({ title: 'Sync Failed', description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Sync operation failed', variant: 'destructive' })
    } finally {
      setIsSyncing(false)
    }
  }

  const getConnectionStatusBadge = () => {
    switch (config.connectionStatus) {
      case 'CONNECTED':
        return <Badge className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>
      default:
        return <Badge variant="secondary">Not Tested</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <DashboardHeader
        heading="Peachtree Data Sync"
        text="Import and synchronize data from your legacy Peachtree/Sage 50 database via ODBC."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CONNECTION SETTINGS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-blue-600" />
              ODBC Connection
            </CardTitle>
            <CardDescription>
              Configure the connection to your Peachtree database. Requires ODBC driver to be installed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection Status:</span>
              {getConnectionStatusBadge()}
            </div>

            {config.lastConnectionTest && (
              <p className="text-xs text-muted-foreground">
                Last tested: {new Date(config.lastConnectionTest).toLocaleString()}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="dsn">Data Source Name (DSN)</Label>
              <Input
                id="dsn"
                placeholder="e.g., Peachtree, Sage50_Company"
                value={config.dsn}
                onChange={(e) => setConfig(prev => ({ ...prev, dsn: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                The ODBC DSN configured in Windows ODBC Data Source Administrator
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username (Optional)</Label>
              <Input
                id="username"
                placeholder="Leave blank if not required"
                value={config.username}
                onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave blank if not required"
                value={config.password}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
            >
              {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
            <Button
              onClick={handleTestConnection}
              disabled={isTestingConnection || !config.dsn}
            >
              {isTestingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
          </CardFooter>
        </Card>

        {/* CURRENT SYNC STATUS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              Synced Records
            </CardTitle>
            <CardDescription>
              Current record mappings between Peachtree and SageFlow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(ENTITY_CONFIG).map(([key, { label, icon }]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant="outline">{mappingStats[key] || mappingStats[key.replace('chartOfAccounts', 'account')] || 0}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" onClick={loadMappingStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* SYNC CONFIGURATION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-600" />
            Run Synchronization
          </CardTitle>
          <CardDescription>
            Select which entities to sync and configure sync options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entity Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Entities to Sync</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={handleSelectNone}>Clear</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.entries(ENTITY_CONFIG) as [SyncableEntity, typeof ENTITY_CONFIG[SyncableEntity]][]).map(([key, { label, icon, description }]) => (
                <div
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEntities.includes(key) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleEntityToggle(key)}
                >
                  <Checkbox
                    checked={selectedEntities.includes(key)}
                    onCheckedChange={() => handleEntityToggle(key)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range (for invoices/payments) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStart">Date Range Start (Optional)</Label>
              <Input
                id="dateStart"
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">For invoices and payments only</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd">Date Range End (Optional)</Label>
              <Input
                id="dateEnd"
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="forceUpdate"
                checked={forceUpdate}
                onCheckedChange={(checked) => setForceUpdate(checked as boolean)}
              />
              <Label htmlFor="forceUpdate" className="text-sm">
                Force Update (re-sync all records even if unchanged)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dryRun"
                checked={dryRun}
                onCheckedChange={(checked) => setDryRun(checked as boolean)}
              />
              <Label htmlFor="dryRun" className="text-sm flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Dry Run (preview changes without applying)
              </Label>
            </div>
          </div>

          {/* Progress */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
          )}

          {/* Sync Button */}
          <Button
            size="lg"
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={handleStartSync}
            disabled={isSyncing || selectedEntities.length === 0 || config.connectionStatus !== 'CONNECTED'}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Syncing Data...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {dryRun ? 'Preview Sync' : 'Start Synchronization'}
              </>
            )}
          </Button>

          {config.connectionStatus !== 'CONNECTED' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Connection Required</AlertTitle>
              <AlertDescription>
                Please configure and test your ODBC connection before running a sync.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* SYNC RESULTS */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResult.status === 'COMPLETED' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : syncResult.status === 'PARTIAL' ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Sync Results
            </CardTitle>
            <CardDescription>
              Job ID: {syncResult.jobId} | Duration: {(syncResult.duration / 1000).toFixed(1)}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Entity</th>
                      <th className="text-right p-3 font-medium">Total</th>
                      <th className="text-right p-3 font-medium text-emerald-600">Created</th>
                      <th className="text-right p-3 font-medium text-blue-600">Updated</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Skipped</th>
                      <th className="text-right p-3 font-medium text-red-600">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncResult.summary.map((row) => (
                      <tr key={row.entity} className="border-t">
                        <td className="p-3 font-medium capitalize">{row.entity}</td>
                        <td className="p-3 text-right">{row.total}</td>
                        <td className="p-3 text-right text-emerald-600">{row.created}</td>
                        <td className="p-3 text-right text-blue-600">{row.updated}</td>
                        <td className="p-3 text-right text-muted-foreground">{row.skipped}</td>
                        <td className="p-3 text-right text-red-600">{row.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Errors */}
              {syncResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-red-600">Errors ({syncResult.errors.length})</Label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                    {syncResult.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-700">
                        <span className="font-medium">{error.entity}:{error.id}</span> - {error.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ODBC SETUP HELP */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            ODBC Setup Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p><strong>For Windows:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Install the Pervasive ODBC driver (included with Sage 50/Peachtree)</li>
            <li>Open <code className="bg-muted px-1 rounded">ODBC Data Source Administrator</code> (search in Start Menu)</li>
            <li>Click "Add" under System DSN tab</li>
            <li>Select "Pervasive ODBC Interface" driver</li>
            <li>Configure the DSN name and point to your Peachtree company folder</li>
            <li>Test the connection in the ODBC dialog</li>
          </ol>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Note:</strong> The Peachtree database must not be in exclusive mode.
              Close Peachtree or enable multi-user access before syncing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
