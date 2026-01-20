import { Skeleton } from '@/components/ui/skeleton'

function JournalRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0">
      {/* Date */}
      <div className="w-[140px] pr-4">
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Reference */}
      <div className="w-[120px] pr-4">
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Description */}
      <div className="flex-1 min-w-[200px] pr-4">
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Status */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      {/* Total Debit */}
      <div className="w-[120px] pr-4 text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
      {/* Total Credit */}
      <div className="w-[120px] text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Card with Table */}
      <div className="bg-card rounded-lg border">
        {/* Card Header */}
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Table Header */}
        <div className="flex items-center px-4 py-3 bg-muted/50 border-b">
          <div className="w-[140px] pr-4"><Skeleton className="h-4 w-10" /></div>
          <div className="w-[120px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="flex-1 min-w-[200px] pr-4"><Skeleton className="h-4 w-20" /></div>
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-12" /></div>
          <div className="w-[120px] pr-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></div>
          <div className="w-[120px] text-right"><Skeleton className="h-4 w-20 ml-auto" /></div>
        </div>

        {/* Table Rows */}
        <JournalRowSkeleton />
        <JournalRowSkeleton />
        <JournalRowSkeleton />
        <JournalRowSkeleton />
        <JournalRowSkeleton />
      </div>
    </div>
  )
}
