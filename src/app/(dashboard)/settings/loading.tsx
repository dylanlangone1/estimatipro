export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-8 w-48 bg-card rounded-lg" />
        <div className="h-4 w-72 bg-card rounded mt-2" />
      </div>

      {/* Form skeleton */}
      <div className="bg-card rounded-xl border border-card-border p-6 space-y-6">
        {/* Two-column grid of fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-background rounded" />
              <div className="h-10 w-full bg-background rounded-lg" />
            </div>
          ))}
        </div>

        {/* Full-width fields */}
        <div className="space-y-2">
          <div className="h-4 w-32 bg-background rounded" />
          <div className="h-10 w-full bg-background rounded-lg" />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <div className="h-10 w-32 bg-background rounded-lg" />
        </div>
      </div>
    </div>
  )
}
