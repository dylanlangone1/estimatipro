import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function EstimateLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div>
        <Skeleton variant="shimmer" className="h-4 w-32 mb-2" />
        <Skeleton variant="shimmer" className="h-8 w-80 mb-2" />
        <div className="flex gap-3 mt-2">
          <Skeleton variant="shimmer" className="h-6 w-16 rounded-full" />
          <Skeleton variant="shimmer" className="h-4 w-24" />
          <Skeleton variant="shimmer" className="h-4 w-32" />
        </div>
      </div>

      {/* Description card skeleton */}
      <Card>
        <CardHeader>
          <Skeleton variant="shimmer" className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton variant="shimmer" className="h-4 w-full mb-2" />
          <Skeleton variant="shimmer" className="h-4 w-3/4 mb-2" />
          <Skeleton variant="shimmer" className="h-4 w-1/2" />
        </CardContent>
      </Card>

      {/* Line items table skeleton */}
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <Skeleton variant="shimmer" className="h-5 w-24" />
            <Skeleton variant="shimmer" className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex border-b border-card-border px-4 py-3 gap-4">
            <Skeleton variant="shimmer" className="h-4 flex-1" />
            <Skeleton variant="shimmer" className="h-4 w-16" />
            <Skeleton variant="shimmer" className="h-4 w-12" />
            <Skeleton variant="shimmer" className="h-4 w-24" />
            <Skeleton variant="shimmer" className="h-4 w-28" />
          </div>
          {/* 8 fake line item rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex border-b border-card-border/50 px-4 py-3 gap-4"
            >
              <Skeleton variant="shimmer" className="h-4 flex-1" />
              <Skeleton variant="shimmer" className="h-4 w-12" />
              <Skeleton variant="shimmer" className="h-4 w-8" />
              <Skeleton variant="shimmer" className="h-4 w-20" />
              <Skeleton variant="shimmer" className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals skeleton */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between">
              <Skeleton variant="shimmer" className="h-4 w-16" />
              <Skeleton variant="shimmer" className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton variant="shimmer" className="h-4 w-24" />
              <Skeleton variant="shimmer" className="h-4 w-20" />
            </div>
            <div className="flex justify-between pt-2 border-t border-card-border">
              <Skeleton variant="shimmer" className="h-5 w-12" />
              <Skeleton variant="shimmer" className="h-7 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
