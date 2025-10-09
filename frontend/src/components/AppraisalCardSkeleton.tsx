import { Skeleton } from "./ui/skeleton";
import { Card, CardContent } from "./ui/card";

export function AppraisalCardSkeleton() {
  return (
    <Card className="shadow-soft border-l-4 border-l-gray-200">
      <CardContent className="p-5 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex-1 space-y-5">
            {/* Line 1: Personnel Skeletons */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Appraisee */}
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>

              {/* Appraiser */}
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>

              {/* Reviewer */}
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>

            {/* Line 2: Details Skeletons */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Type */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>

              {/* Period */}
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-12" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Progress Section Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className="flex flex-col items-center relative z-10 flex-1"
                >
                  <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
                  <Skeleton className="h-3 w-16 mt-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified skeleton for list views
export function AppraisalCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <AppraisalCardSkeleton key={index} />
      ))}
    </div>
  );
}
