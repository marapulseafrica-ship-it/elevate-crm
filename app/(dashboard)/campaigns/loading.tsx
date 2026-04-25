import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>
      {/* AI timing card */}
      <Skeleton className="h-20 w-full rounded-xl" />
      {/* Campaign builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border p-6 space-y-6">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-28 w-full rounded-md" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
      {/* History table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <Skeleton className="h-5 w-36" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
