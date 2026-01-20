import { Skeleton } from '@/components/ui/skeleton'

function ItemRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0">
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex-1 min-w-[180px] pr-4 space-y-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="w-[100px] pr-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
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
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Skeleton className="flex-1 h-10 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="flex items-center px-4 py-3 bg-slate-50 border-b">
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="flex-1 min-w-[180px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[60px] flex justify-end"><Skeleton className="h-4 w-14" /></div>
        </div>
        <ItemRowSkeleton />
        <ItemRowSkeleton />
        <ItemRowSkeleton />
        <ItemRowSkeleton />
        <ItemRowSkeleton />
      </div>
    </div>
  )
}
