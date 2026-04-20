export default function ForgeHistoryLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded" style={{ background: 'var(--border-subtle)' }} />
        <div className="h-8 w-32 rounded" style={{ background: 'var(--border-subtle)' }} />
        <div className="h-3 w-40 rounded" style={{ background: 'var(--border-subtle)' }} />
      </div>
      <div className="h-20 rounded-[12px]" style={{ background: 'var(--border-subtle)' }} />
      <div className="h-80 rounded-[12px]" style={{ background: 'var(--border-subtle)' }} />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 rounded-[12px]" style={{ background: 'var(--border-subtle)' }} />
        ))}
      </div>
    </div>
  );
}
