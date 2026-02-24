import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div>
        <Skeleton variant="shimmer" className="h-8 w-64 mb-1" />
        <Skeleton variant="shimmer" className="h-4 w-48" />
      </div>

      {/* Quick action card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton variant="shimmer" className="h-5 w-40 mb-2" />
              <Skeleton variant="shimmer" className="h-4 w-64" />
            </div>
            <Skeleton variant="shimmer" className="h-10 w-36 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 text-center">
              <Skeleton variant="shimmer" className="h-6 w-6 mx-auto mb-2 rounded" />
              <Skeleton variant="shimmer" className="h-8 w-16 mx-auto mb-1" />
              <Skeleton variant="shimmer" className="h-3 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent estimates */}
      <div>
        <Skeleton variant="shimmer" className="h-6 w-40 mb-4" />
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton variant="shimmer" className="h-4 w-48 mb-1" />
                    <Skeleton variant="shimmer" className="h-3 w-32" />
                  </div>
                  <Skeleton variant="shimmer" className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
