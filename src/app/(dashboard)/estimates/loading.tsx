import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function EstimatesLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton variant="shimmer" className="h-8 w-48 mb-1" />
          <Skeleton variant="shimmer" className="h-4 w-24" />
        </div>
        <Skeleton variant="shimmer" className="h-10 w-36 rounded-lg" />
      </div>

      {/* Estimate cards */}
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Skeleton variant="shimmer" className="h-5 w-48" />
                    <Skeleton variant="shimmer" className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton variant="shimmer" className="h-4 w-24" />
                    <Skeleton variant="shimmer" className="h-4 w-20" />
                  </div>
                </div>
                <Skeleton variant="shimmer" className="h-6 w-24 ml-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
