export default function ForgeHistoryLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-24 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-40 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="h-16 rounded-2xl bg-white/[0.04]" />
      <div className="h-72 rounded-2xl bg-white/[0.04]" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
