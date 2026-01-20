import { Skeleton } from '@/components/ui/skeleton'

function ReportRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-b-0">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-28" />
    </div>
  )
}

function ReportSectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-24 mb-3" />
      <div className="bg-white rounded-lg border border-slate-200">
        {Array.from({ length: rows }).map((_, i) => (
          <ReportRowSkeleton key={i} />
        ))}
      </div>
      <div className="flex justify-between py-2 px-4 font-medium">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-28" />
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
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>

      {/* Revenue Section */}
      <ReportSectionSkeleton rows={3} />

      {/* Expenses Section */}
      <ReportSectionSkeleton rows={5} />

      {/* Net Income */}
      <div className="bg-emerald-50 rounded-lg p-4 flex justify-between items-center border border-emerald-200">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  )
}
