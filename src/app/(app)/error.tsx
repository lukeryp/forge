'use client';

import { useEffect } from 'react';

export default function ForgeErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[FORGE error boundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-xs text-muted-foreground mt-1">
          Failed to load the FORGE dashboard. Please try again.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-2 text-sm hover:bg-white/[0.1] transition"
      >
        Try again
      </button>
    </div>
  );
}
