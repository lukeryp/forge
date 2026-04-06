export default function ForgeDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-24 rounded-lg bg-white/[0.06]" />
          <div className="h-4 w-40 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-white/[0.06]" />
      </div>

      {/* Hero card skeleton */}
      <div className="glass rounded-2xl border border-white/[0.06] p-6">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="w-40 h-40 rounded-full bg-white/[0.04] flex-shrink-0" />
          <div className="flex-1 w-full space-y-3">
            <div className="h-3 w-24 rounded bg-white/[0.04]" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Session list skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
