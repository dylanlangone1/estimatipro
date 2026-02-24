export default function SubscriptionLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Current Plan Card */}
      <div className="bg-card rounded-xl border border-card-border p-6 space-y-4">
        <div className="h-6 w-36 bg-background rounded" />
        <div className="flex items-center gap-4">
          <div className="h-10 w-28 bg-background rounded-full" />
          <div className="space-y-1">
            <div className="h-5 w-48 bg-background rounded" />
            <div className="h-4 w-36 bg-background rounded" />
          </div>
        </div>
        <div className="h-10 w-44 bg-background rounded-lg" />
      </div>

      {/* Plan Comparison Table */}
      <div className="bg-card rounded-xl border border-card-border p-6 space-y-4">
        <div className="h-6 w-40 bg-background rounded" />

        {/* Table header */}
        <div className="grid grid-cols-5 gap-4 py-3 border-b border-card-border">
          <div className="h-4 w-20 bg-background rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-16 bg-background rounded mx-auto" />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 py-2">
            <div className="h-4 w-32 bg-background rounded" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-4 w-10 bg-background rounded mx-auto" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
