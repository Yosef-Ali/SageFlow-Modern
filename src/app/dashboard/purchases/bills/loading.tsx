import { Skeleton } from '@/components/ui/skeleton'

function BillRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0">
      {/* Bill # */}
      <div className="w-[120px] pr-4">
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Vendor */}
      <div className="flex-1 min-w-[160px] pr-4">
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Date */}
      <div className="w-[110px] pr-4">
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Due Date */}
      <div className="w-[110px] pr-4">
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Amount */}
      <div className="w-[120px] pr-4">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Table Header */}
        <div className="flex items-center px-4 py-3 bg-muted/50 border-b">
          <div className="w-[120px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="flex-1 min-w-[160px] pr-4"><Skeleton className="h-4 w-14" /></div>
          <div className="w-[110px] pr-4"><Skeleton className="h-4 w-10" /></div>
          <div className="w-[110px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="w-[120px] pr-4"><Skeleton className="h-4 w-14" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[60px] flex justify-end"><Skeleton className="h-4 w-14" /></div>
        </div>

        {/* Table Rows */}
        <BillRowSkeleton />
        <BillRowSkeleton />
        <BillRowSkeleton />
        <BillRowSkeleton />
        <BillRowSkeleton />
      </div>

      {/* Pagination */}
      <Skeleton className="h-4 w-40" />
    </div>
  )
}
