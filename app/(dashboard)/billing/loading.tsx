import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-xl border p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-6 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-20" />
              <div className="space-y-2 pt-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full rounded-lg mt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
