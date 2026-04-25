import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-3 pt-2">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
