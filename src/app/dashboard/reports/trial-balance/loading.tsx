import { Skeleton } from '@/components/ui/skeleton'

function TrialBalanceRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-3 border-b last:border-b-0">
      {/* Account # */}
      <div className="w-[100px] pr-4">
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Account Name */}
      <div className="flex-1 min-w-[200px] pr-4">
        <Skeleton className="h-4 w-40" />
      </div>
      {/* Debit */}
      <div className="w-[140px] pr-4 text-right">
        <Skeleton className="h-4 w-24 ml-auto" />
      </div>
      {/* Credit */}
      <div className="w-[140px] text-right">
        <Skeleton className="h-4 w-24 ml-auto" />
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
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Table Header */}
        <div className="flex items-center px-4 py-3 bg-slate-50 border-b">
          <div className="w-[100px] pr-4"><Skeleton className="h-4 w-16" /></div>
          <div className="flex-1 min-w-[200px] pr-4"><Skeleton className="h-4 w-24" /></div>
          <div className="w-[140px] pr-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
          <div className="w-[140px] text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
        </div>

        {/* Table Rows */}
        <TrialBalanceRowSkeleton />
        <TrialBalanceRowSkeleton />
        <TrialBalanceRowSkeleton />
        <TrialBalanceRowSkeleton />
        <TrialBalanceRowSkeleton />
        <TrialBalanceRowSkeleton />
        <TrialBalanceRowSkeleton />
        <TrialBalanceRowSkeleton />

        {/* Totals Row */}
        <div className="flex items-center px-4 py-3 bg-slate-100 border-t font-medium">
          <div className="w-[100px] pr-4"></div>
          <div className="flex-1 min-w-[200px] pr-4">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="w-[140px] pr-4 text-right">
            <Skeleton className="h-4 w-28 ml-auto" />
          </div>
          <div className="w-[140px] text-right">
            <Skeleton className="h-4 w-28 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
