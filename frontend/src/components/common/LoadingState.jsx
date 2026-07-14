import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const PageLoader = () => (
  <div className="space-y-6 p-1" data-testid="page-loader">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-56 shimmer" />
      <Skeleton className="h-8 w-32 shimmer" />
    </div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl shimmer" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Skeleton className="h-72 rounded-xl shimmer lg:col-span-2" />
      <Skeleton className="h-72 rounded-xl shimmer" />
    </div>
  </div>
);

export const PanelSkeleton = ({ className = "h-64" }) => (
  <Skeleton className={`w-full rounded-xl shimmer ${className}`} />
);

export const RowsSkeleton = ({ rows = 6 }) => (
  <div className="space-y-2">
    {[...Array(rows)].map((_, i) => (
      <Skeleton key={i} className="h-10 w-full rounded-lg shimmer" />
    ))}
  </div>
);
