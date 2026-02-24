import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function NewEstimateLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <Skeleton variant="shimmer" className="h-9 w-56 mx-auto mb-2" />
        <Skeleton variant="shimmer" className="h-4 w-80 mx-auto" />
      </div>

      {/* Form card */}
      <Card>
        <CardContent className="p-6">
          <Skeleton variant="shimmer" className="h-48 w-full rounded-lg mb-4" />
          <div className="flex items-center justify-between">
            <Skeleton variant="shimmer" className="h-4 w-40" />
            <Skeleton variant="shimmer" className="h-12 w-48 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
