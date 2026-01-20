import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Import/Export Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Import Card */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg border-2 border-dashed" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>

        {/* Export Card */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Peachtree Import Section */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full mt-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
