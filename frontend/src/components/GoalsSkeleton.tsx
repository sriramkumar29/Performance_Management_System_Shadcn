import { Skeleton } from "./ui/skeleton";

export function GoalCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Goal Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Goal Metrics */}
      <div className="flex gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Rating Section */}
      <div className="space-y-2 pt-2 border-t">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-8 rounded" />
          ))}
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function GoalsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <GoalCardSkeleton key={index} />
      ))}
    </div>
  );
}
