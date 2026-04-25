import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-lg" />
        ))}
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-48 w-full rounded-full mx-auto" style={{ maxWidth: 200 }} />
        </div>
      </div>
      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <Skeleton className="h-5 w-40" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
