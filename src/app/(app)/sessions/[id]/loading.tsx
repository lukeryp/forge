export default function ForgeSessionDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-pulse">
      <div className="h-4 w-20 rounded" style={{ background: 'var(--border-subtle)' }} />
      <div className="space-y-2">
        <div className="h-3 w-32 rounded" style={{ background: 'var(--border-subtle)' }} />
        <div className="h-7 w-56 rounded" style={{ background: 'var(--border-subtle)' }} />
      </div>
      <div className="rounded-[12px] p-8 flex justify-center" style={{ background: 'var(--surface-elevated)' }}>
        <div className="w-[180px] h-[180px] rounded-full" style={{ background: 'var(--border-subtle)' }} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-[12px]" style={{ background: 'var(--border-subtle)' }} />
        ))}
      </div>
    </div>
  );
}
