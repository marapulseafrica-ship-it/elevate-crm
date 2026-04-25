import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
        <div className="flex-1" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table */}
        <div className="lg:col-span-3 bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b grid grid-cols-6 gap-4">
            {["Name", "Phone", "Last Visit", "Visits", "Segment", "Status"].map((h) => (
              <Skeleton key={h} className="h-4 w-full" />
            ))}
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 border-b grid grid-cols-6 gap-4 items-center">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </div>
        {/* Sidebar */}
        <div className="bg-white rounded-xl border p-6 space-y-3 h-fit">
          <Skeleton className="h-5 w-36" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
