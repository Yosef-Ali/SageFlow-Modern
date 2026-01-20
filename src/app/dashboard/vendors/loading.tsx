import { Skeleton } from '@/components/ui/skeleton'

function VendorRowSkeleton() {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
    </tr>
  )
}

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-52" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full max-w-md rounded-md" />

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left"><Skeleton className="h-3 w-16" /></th>
              <th className="px-6 py-3 text-left"><Skeleton className="h-3 w-10" /></th>
              <th className="px-6 py-3 text-left"><Skeleton className="h-3 w-12" /></th>
              <th className="px-6 py-3 text-left"><Skeleton className="h-3 w-12" /></th>
              <th className="px-6 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></th>
              <th className="px-6 py-3 text-center"><Skeleton className="h-3 w-12 mx-auto" /></th>
              <th className="px-6 py-3 text-right"><Skeleton className="h-3 w-14 ml-auto" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <VendorRowSkeleton />
            <VendorRowSkeleton />
            <VendorRowSkeleton />
            <VendorRowSkeleton />
            <VendorRowSkeleton />
          </tbody>
        </table>
      </div>
    </div>
  )
}
