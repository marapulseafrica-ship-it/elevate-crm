import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="bg-white rounded-xl border overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-4 border-b items-start">
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
