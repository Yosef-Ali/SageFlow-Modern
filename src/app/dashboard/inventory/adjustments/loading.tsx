import { Skeleton } from '@/components/ui/skeleton'

function AdjustmentRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0">
      {/* Date */}
      <div className="w-[120px] pr-4">
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Reference */}
      <div className="w-[120px] pr-4">
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Item */}
      <div className="flex-1 min-w-[180px] pr-4">
        <Skeleton className="h-4 w-36" />
      </div>
      {/* Type */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      {/* Quantity */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-12" />
      </div>
      {/* Reason */}
      <div className="w-[150px]">
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="flex items-center px-4 py-3 bg-slate-50 border-b">
          <div className="w-[120px] pr-4"><Skeleton className="h-4 w-10" /></div>
          <div className="w-[120px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="flex-1 min-w-[180px] pr-4"><Skeleton className="h-4 w-10" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-10" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="w-[150px]"><Skeleton className="h-4 w-14" /></div>
        </div>
        <AdjustmentRowSkeleton />
        <AdjustmentRowSkeleton />
        <AdjustmentRowSkeleton />
        <AdjustmentRowSkeleton />
        <AdjustmentRowSkeleton />
      </div>
    </div>
  )
}
