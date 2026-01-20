import { Skeleton } from '@/components/ui/skeleton'

function ReportRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-b-0">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-28" />
    </div>
  )
}

function ReportSectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-32 mb-3" />
      <div className="bg-card rounded-lg border">
        <ReportRowSkeleton />
        <ReportRowSkeleton />
        <ReportRowSkeleton />
        <ReportRowSkeleton />
      </div>
      <div className="flex justify-between py-2 px-4 font-medium">
        <Skeleton className="h-4 w-24" />
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
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-5 w-64" />
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

      {/* Report Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Assets */}
        <ReportSectionSkeleton />

        {/* Liabilities */}
        <ReportSectionSkeleton />
      </div>

      {/* Equity Section */}
      <ReportSectionSkeleton />

      {/* Total */}
      <div className="bg-muted/50 rounded-lg p-4 flex justify-between items-center">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  )
}
