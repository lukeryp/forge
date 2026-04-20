export default function ForgeDashboardLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded" style={{ background: 'var(--border-subtle)' }} />
        <div className="flex gap-8">
          <div className="w-[180px] h-[180px] rounded-full" style={{ background: 'var(--border-subtle)' }} />
          <div className="flex-1 space-y-4">
            <div className="h-3 w-24 rounded" style={{ background: 'var(--border-subtle)' }} />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-[12px]" style={{ background: 'var(--border-subtle)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-[12px]" style={{ background: 'var(--border-subtle)' }} />
        ))}
      </div>
    </div>
  );
}
