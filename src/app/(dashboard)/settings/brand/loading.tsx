export default function BrandSettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Logo & Colors Section */}
      <div className="bg-card rounded-xl border border-card-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-background rounded" />
          <div className="h-6 w-36 bg-background rounded" />
        </div>

        <div className="flex items-start gap-6">
          {/* Logo placeholder */}
          <div className="w-24 h-24 bg-background rounded-lg shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-10 w-36 bg-background rounded-lg" />
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="w-12 h-12 bg-background rounded-lg" />
                  <div className="h-3 w-12 bg-background rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Section */}
      <div className="bg-card rounded-xl border border-card-border p-6 space-y-3">
        <div className="h-6 w-44 bg-background rounded" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 bg-background rounded" />
              <div className="h-5 w-40 bg-background rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Template Designer Section */}
      <div className="bg-card rounded-xl border border-card-border p-6 space-y-4">
        <div className="h-6 w-48 bg-background rounded" />
        <div className="h-4 w-80 bg-background rounded" />
        <div className="h-12 w-48 bg-background rounded-lg" />
      </div>
    </div>
  )
}
