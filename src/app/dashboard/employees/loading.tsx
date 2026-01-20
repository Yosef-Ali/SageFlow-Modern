import { Skeleton } from '@/components/ui/skeleton'

function EmployeeRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0">
      {/* Avatar + Name */}
      <div className="flex-1 min-w-[200px] pr-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      {/* Job Title */}
      <div className="w-[150px] pr-4">
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Department */}
      <div className="w-[150px] pr-4">
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Status */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      {/* Actions */}
      <div className="w-[60px] flex justify-end">
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Search */}
      <div className="py-4">
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center px-4 py-3 bg-muted/50 border-b">
          <div className="flex-1 min-w-[200px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="w-[150px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="w-[150px] pr-4"><Skeleton className="h-4 w-20" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[60px] flex justify-end"><Skeleton className="h-4 w-14" /></div>
        </div>

        {/* Table Rows */}
        <EmployeeRowSkeleton />
        <EmployeeRowSkeleton />
        <EmployeeRowSkeleton />
        <EmployeeRowSkeleton />
        <EmployeeRowSkeleton />
      </div>
    </div>
  )
}
