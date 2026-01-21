'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface SyncJob {
  id: string
  jobType: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL'
  entities: string[]
  dateRangeStart: string | null
  dateRangeEnd: string | null
  startedAt: string | null
  completedAt: string | null
  totalRecords: string
  processedRecords: string
  failedRecords: string
  errorLog: Array<{ entity: string; id: string; error: string }> | null
  createdAt: string
}

export default function SyncHistoryPage() {
  const [history, setHistory] = useState<SyncJob[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  // TODO: Get actual company ID from auth context
  const companyId = 'demo-company'

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sync?companyId=${companyId}&limit=50`)
      const data = await res.json()
      setHistory(data.history || [])
    } catch (error) {
      console.error('Failed to load sync history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: SyncJob['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>
      case 'PARTIAL':
        return <Badge className="bg-amber-600"><AlertTriangle className="h-3 w-3 mr-1" /> Partial</Badge>
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> In Progress</Badge>
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
    }
  }

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case 'FULL_MIGRATION':
        return 'Full Migration'
      case 'SELECTIVE_SYNC':
        return 'Selective Sync'
      case 'INCREMENTAL_SYNC':
        return 'Incremental Sync'
      default:
        return jobType
    }
  }

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return '-'
    const start = new Date(startedAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()

    if (durationMs < 1000) return `${durationMs}ms`
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`
    return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <DashboardHeader
        heading="Sync History"
        text="View past synchronization jobs and their results"
      />

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {history.length} sync jobs
        </p>
        <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading sync history...</p>
          </CardContent>
        </Card>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No Sync History</h3>
            <p className="mt-2 text-muted-foreground">
              You haven't run any synchronization jobs yet.
            </p>
            <Button className="mt-4" onClick={() => window.location.href = '/dashboard/settings/peachtree-sync'}>
              Start First Sync
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((job) => (
            <Card key={job.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusBadge(job.status)}
                    <div>
                      <p className="font-medium">{getJobTypeLabel(job.jobType)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{parseInt(job.totalRecords || '0')} records</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(job.startedAt, job.completedAt)}
                      </p>
                    </div>
                    {expandedJob === job.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {expandedJob === job.id && (
                <CardContent className="border-t bg-muted/30 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Job ID</p>
                      <p className="text-sm font-mono">{job.id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Records</p>
                      <p className="text-sm font-medium">{job.totalRecords}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Processed</p>
                      <p className="text-sm font-medium text-emerald-600">{job.processedRecords}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-sm font-medium text-red-600">{job.failedRecords}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Entities Synced</p>
                    <div className="flex flex-wrap gap-2">
                      {job.entities?.map((entity) => (
                        <Badge key={entity} variant="outline" className="capitalize">
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {job.dateRangeStart && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Date Range Filter</p>
                      <p className="text-sm">
                        {new Date(job.dateRangeStart).toLocaleDateString()}
                        {job.dateRangeEnd && ` - ${new Date(job.dateRangeEnd).toLocaleDateString()}`}
                      </p>
                    </div>
                  )}

                  {job.errorLog && job.errorLog.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Errors ({job.errorLog.length})</p>
                      <div className="max-h-32 overflow-y-auto rounded border border-red-200 bg-red-50 p-2 space-y-1">
                        {job.errorLog.slice(0, 10).map((error, idx) => (
                          <p key={idx} className="text-xs text-red-700">
                            <span className="font-medium">{error.entity}:{error.id}</span> - {error.error}
                          </p>
                        ))}
                        {job.errorLog.length > 10 && (
                          <p className="text-xs text-red-500 font-medium">
                            ... and {job.errorLog.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
