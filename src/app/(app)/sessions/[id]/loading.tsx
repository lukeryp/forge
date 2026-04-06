export default function ForgeSessionDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      <div className="h-4 w-20 rounded bg-white/[0.06]" />
      <div className="space-y-2">
        <div className="h-6 w-48 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-64 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="glass rounded-2xl border border-white/[0.06] p-6 flex justify-center">
        <div className="w-40 h-40 rounded-full bg-white/[0.04]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
