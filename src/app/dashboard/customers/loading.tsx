import { Skeleton } from '@/components/ui/skeleton'

function TableRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-3 border-b last:border-b-0">
      {/* Customer # */}
      <div className="w-[120px] pr-4">
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Name + Email */}
      <div className="flex-1 min-w-[200px] pr-4 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
      {/* Phone */}
      <div className="w-[140px] pr-4">
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Balance */}
      <div className="w-[120px] pr-4">
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Status Badge */}
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
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-5 w-52" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />

        {/* Status Toggle Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-12 rounded-md" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center px-4 py-3 bg-slate-50 border-b">
          <div className="w-[120px] pr-4">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex-1 min-w-[200px] pr-4">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="w-[140px] pr-4">
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="w-[120px] pr-4">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="w-[100px] pr-4">
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="w-[60px] flex justify-end">
            <Skeleton className="h-4 w-14" />
          </div>
        </div>

        {/* Table Rows */}
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
      </div>

      {/* Pagination Info Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}
