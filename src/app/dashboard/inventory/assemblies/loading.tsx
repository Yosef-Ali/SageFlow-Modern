import { Skeleton } from '@/components/ui/skeleton'

function AssemblyRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0">
      {/* SKU */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Name */}
      <div className="flex-1 min-w-[180px] pr-4">
        <Skeleton className="h-4 w-36" />
      </div>
      {/* Components */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-8" />
      </div>
      {/* Qty on Hand */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-12" />
      </div>
      {/* Cost */}
      <div className="w-[120px] pr-4">
        <Skeleton className="h-4 w-20" />
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
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full max-w-md rounded-md" />

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="flex items-center px-4 py-3 bg-muted/50 border-b">
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-10" /></div>
          <div className="flex-1 min-w-[180px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-20" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="w-[120px] pr-4"><Skeleton className="h-4 w-10" /></div>
          <div className="w-[60px] flex justify-end"><Skeleton className="h-4 w-14" /></div>
        </div>
        <AssemblyRowSkeleton />
        <AssemblyRowSkeleton />
        <AssemblyRowSkeleton />
        <AssemblyRowSkeleton />
      </div>
    </div>
  )
}
