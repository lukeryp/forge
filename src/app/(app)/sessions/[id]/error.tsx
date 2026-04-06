'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ForgeSessionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[FORGE session detail error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
      <p className="text-sm font-medium">Failed to load session</p>
      <p className="text-xs text-muted-foreground">This session may no longer exist or you may not have access.</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-2 text-sm hover:bg-white/[0.1] transition"
        >
          Try again
        </button>
        <Link href="/forge" className="rounded-xl bg-brand-green/10 border border-brand-green/20 px-4 py-2 text-sm text-brand-green hover:bg-brand-green/15 transition">
          Back to FORGE
        </Link>
      </div>
    </div>
  );
}
